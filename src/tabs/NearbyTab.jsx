import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { getMessages, getSyncPayload, mergeMessages, parseSyncPayload } from '../store';
import { createNativeNearbySession, isNativeNearbyAvailable } from '../nativeNearby';

const FRAME_CHARS = 420;
const FRAME_MS = 900;

const makeTransferId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const makeFrames = (payload) => {
  const id = makeTransferId();
  const chunks = [];
  for (let i = 0; i < payload.length; i += FRAME_CHARS) {
    chunks.push(payload.slice(i, i + FRAME_CHARS));
  }
  return chunks.map((chunk, index) => JSON.stringify({
    mesh: 'burst-v1',
    id,
    index,
    total: chunks.length,
    chunk
  }));
};

export default function NearbyTab({ showToast, onSync }) {
  const [mode, setMode] = useState('send');
  const [payload, setPayload] = useState(() => getSyncPayload(12000));
  const [frameIndex, setFrameIndex] = useState(0);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanProgress, setScanProgress] = useState({ id: null, total: 0, count: 0 });
  const [selectedMsgs, setSelectedMsgs] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [nativeActive, setNativeActive] = useState(false);
  const [nativeStatus, setNativeStatus] = useState('Native P2P ready');
  const [nativePeers, setNativePeers] = useState(0);
  const scannerRef = useRef(null);
  const collectedRef = useRef(new Map());
  const nativeSessionRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const nativeAvailable = isNativeNearbyAvailable();
  const allMessages = getMessages();

  const frames = useMemo(() => makeFrames(payload), [payload]);

  useEffect(() => {
    if (mode !== 'send' || frames.length <= 1) return undefined;
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [frames.length, mode]);

  useEffect(() => () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    if (nativeSessionRef.current) {
      nativeSessionRef.current.stop();
      nativeSessionRef.current = null;
    }
  }, []);

  const refreshPayload = () => {
    setPayload(getSyncPayload(12000, selectedMsgs.length > 0 ? selectedMsgs : null));
    setFrameIndex(0);
    showToast(selectedMsgs.length > 0 ? `Broadcasting ${selectedMsgs.length} selected` : 'Broadcasting all messages');
  };

  const toggleMsgSelection = (id) => {
    setSelectedMsgs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const importPayload = (incomingPayload) => {
    const incomingMsgs = parseSyncPayload(incomingPayload);
    const res = mergeMessages(incomingMsgs);
    if (res.added > 0) {
      showToast(`Imported ${res.added} messages`);
      onSync();
    } else {
      showToast('Already up to date');
    }
  };

  const handleScan = (decodedText) => {
    try {
      const frame = JSON.parse(decodedText);
      if (frame.mesh !== 'burst-v1') {
        importPayload(decodedText);
        return;
      }

      if (!collectedRef.current.has(frame.id)) {
        collectedRef.current.clear();
        collectedRef.current.set(frame.id, new Map());
      }

      const bucket = collectedRef.current.get(frame.id);
      bucket.set(frame.index, frame.chunk);
      setScanProgress({ id: frame.id, total: frame.total, count: bucket.size });

      if (bucket.size === frame.total) {
        const assembled = Array.from({ length: frame.total }, (_, i) => bucket.get(i)).join('');
        collectedRef.current.clear();
        setScanProgress({ id: null, total: 0, count: 0 });
        stopScanning();
        importPayload(assembled);
      }
    } catch {
      try {
        importPayload(decodedText);
        stopScanning();
      } catch {
        showToast('Invalid relay frame', true);
      }
    }
  };

  useEffect(() => {
    if (!scannerActive) return;

    let stream;
    let controls;

    const startCamera = async () => {
      try {
        const codeReader = new BrowserQRCodeReader();
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const constraints = { video: { facingMode: "environment" } };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        videoElement.srcObject = stream;
        await videoElement.play();
        
        controls = await codeReader.decodeFromVideoElement(videoElement, (result) => {
          if (result) handleScan(result.getText());
        });
        
        scannerRef.current = {
          stop: () => {
            if (controls) controls.stop();
            if (stream) stream.getTracks().forEach(track => track.stop());
          }
        };
      } catch (err) {
        console.error(err);
        showToast('Camera blocked. Please check permissions.', true);
        setScannerActive(false);
      }
    };

    startCamera();

    return () => {
      if (scannerRef.current) scannerRef.current.stop();
    };
  }, [scannerActive]);

  const startScanning = () => {
    setMode('receive');
    setScannerActive(true);
    setScanProgress({ id: null, total: 0, count: 0 });
    collectedRef.current.clear();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const codeReader = new BrowserQRCodeReader();
    try {
      const result = await codeReader.decodeFromImageElement(URL.createObjectURL(file));
      handleScan(result.getText());
    } catch (err) {
      showToast('No QR detected in image', true);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const startNativeNearby = async () => {
    const session = createNativeNearbySession({
      onStatus: setNativeStatus,
      onPeerCount: setNativePeers,
      onImported: (added) => {
        if (added > 0) {
          showToast(`Imported ${added} messages over native P2P`);
          onSync();
        } else {
          showToast('Native P2P sync complete');
        }
      },
      onError: (message) => {
        setNativeStatus(message);
        showToast(message, true);
        setNativeActive(false);
      }
    });

    nativeSessionRef.current = session;
    setNativeActive(true);
    try {
      await session.start();
    } catch (error) {
      const message = error?.message || 'Native Nearby failed to start';
      setNativeStatus(message);
      showToast(message, true);
      setNativeActive(false);
    }
  };

  const stopNativeNearby = async () => {
    if (nativeSessionRef.current) {
      await nativeSessionRef.current.stop();
      nativeSessionRef.current = null;
    }
    setNativePeers(0);
    setNativeActive(false);
  };

  const progressLabel = scanProgress.total > 0
    ? `${scanProgress.count}/${scanProgress.total} frames`
    : 'Waiting for relay frames';
  const currentFrameIndex = frames.length > 0 ? frameIndex % frames.length : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-[#f1f2f6] p-5 rounded-2xl text-[#636e72] text-[11px] leading-relaxed font-medium">
        Nearby uses native device-to-device transfer in the Android app, with low-density QR relay as the browser-safe fallback.
      </div>

      <div className="bg-white border border-[#edf2f7] rounded-[24px] p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest mb-2">Native P2P</h3>
            <p className="text-xs text-[#636e72] leading-relaxed">
              Android install mode uses Nearby Connections to discover peers and exchange message caches without a hotspot.
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${nativeAvailable ? 'bg-[#e8f8f2] text-[#00b894]' : 'bg-[#f1f2f6] text-[#636e72]'}`}>
            {nativeAvailable ? 'Native' : 'Web'}
          </span>
        </div>

        <div className="flex items-center justify-between bg-[#f9fbfc] border border-[#edf2f7] rounded-2xl px-4 py-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#636e72]">Status</span>
            <span className="text-xs font-bold text-[#2d3436]">{nativeStatus}</span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[#636e72]">Peers</span>
            <span className="text-xs font-mono font-bold text-[#2d3436]">{nativePeers}</span>
          </div>
        </div>

        {nativeActive ? (
          <button
            onClick={stopNativeNearby}
            className="w-full py-3.5 bg-red-50 text-[#d63031] rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Stop Native P2P
          </button>
        ) : (
          <button
            onClick={startNativeNearby}
            disabled={!nativeAvailable}
            className="w-full py-3.5 bg-[#5a6b7d] text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-30"
          >
            Start Native P2P
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 bg-white border border-[#edf2f7] p-1 rounded-2xl">
        {['send', 'receive'].map(item => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              mode === item ? 'bg-[#2d3436] text-white' : 'text-[#636e72] hover:bg-[#f9fbfc]'
            }`}
          >
            {item === 'send' ? 'Broadcast' : 'Receive'}
          </button>
        ))}
      </div>

      {mode === 'send' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest">Relay Burst</h3>
              <p className="text-[9px] text-[#636e72] opacity-60">Sharing {selectedMsgs.length || allMessages.length} items</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setIsSelecting(!isSelecting); setSelectedMsgs([]); }}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${isSelecting ? 'bg-[#2d3436] text-white border-[#2d3436]' : 'text-[#5a6b7d] border-[#edf2f7]'}`}
              >
                {isSelecting ? 'Done' : 'Pick Messages'}
              </button>
              <button
                onClick={refreshPayload}
                className="text-[10px] font-bold text-[#5a6b7d] uppercase tracking-widest hover:underline"
              >
                Sync QR
              </button>
            </div>
          </div>

          {isSelecting && (
            <div className="bg-white border border-[#edf2f7] rounded-2xl overflow-hidden shadow-sm max-h-60 overflow-y-auto divide-y divide-[#edf2f7]">
              {allMessages.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => toggleMsgSelection(m.id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedMsgs.includes(m.id) ? 'bg-[#f9fbfc]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex flex-col truncate pr-4">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-[#636e72]">{m.type}</span>
                    <span className="text-xs truncate text-[#2d3436]">{(m.text || '').startsWith('ENC:') ? '[Private Message]' : (m.text || 'Empty Message')}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMsgs.includes(m.id) ? 'bg-green-500 border-green-500 text-white' : 'border-[#cbd5e0]'}`}>
                    {selectedMsgs.includes(m.id) && <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                  </div>
                </div>
              ))}
              {allMessages.length === 0 && <div className="p-4 text-center text-[10px] uppercase font-bold text-[#636e72]">No messages to select</div>}
            </div>
          )}

          <div className="flex flex-col items-center bg-white p-8 border border-[#edf2f7] rounded-[32px] shadow-sm">
            <div className="p-4 bg-white rounded-[24px] border border-[#f9fbfc]">
              <QRCodeSVG
                value={frames[currentFrameIndex] || '[]'}
                size={245}
                level="L"
                includeMargin
                fgColor="#2d3436"
                bgColor="#ffffff"
              />
            </div>

            <div className="mt-6 w-full space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#636e72]">
                <span>Frame {currentFrameIndex + 1} of {frames.length}</span>
                <span>{payload.length} chars</span>
              </div>
              <div className="h-2 bg-[#f1f2f6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5a6b7d] transition-all"
                  style={{ width: `${((currentFrameIndex + 1) / frames.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'receive' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest">Inbound Relay</h3>
            <span className="text-[10px] font-bold text-[#5a6b7d] uppercase tracking-widest">{progressLabel}</span>
          </div>

          {scannerActive ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[28px] border-4 border-white shadow-xl bg-black relative aspect-square">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover" 
                  playsInline 
                  muted 
                  autoPlay
                  style={{ width: '100%', height: '100%', display: 'block' }}
                ></video>
                {scanProgress.total > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/20 text-white">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                      <span>Syncing Burst</span>
                      <span>{scanProgress.count}/{scanProgress.total}</span>
                    </div>
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400" style={{ width: `${(scanProgress.count/scanProgress.total)*100}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={stopScanning}
                  className="py-4 bg-white border border-[#edf2f7] text-[#636e72] rounded-2xl font-bold text-[10px] uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="py-4 bg-[#f1f2f6] text-[#5a6b7d] rounded-2xl font-bold text-[10px] uppercase tracking-widest"
                >
                  File Picker
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*" 
                capture="environment"
                className="hidden"
              />
            </div>
          ) : (
            <button
              onClick={startScanning}
              className="w-full py-16 border-2 border-dashed border-[#edf2f7] rounded-[32px] bg-white text-[#636e72] flex flex-col items-center justify-center gap-3 hover:bg-[#f9fbfc] transition-all shadow-sm"
            >
              <div className="w-12 h-12 bg-[#f1f2f6] rounded-2xl flex items-center justify-center text-[#5a6b7d]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 012 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold uppercase tracking-widest text-[#2d3436]">Start Receiver</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-40">Point at sender frames</span>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="pt-8 border-t border-[#edf2f7] mx-2">
        <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest mb-3">Why This Works</h3>
        <p className="text-[10px] text-[#636e72] leading-relaxed uppercase tracking-widest font-medium opacity-50">
          Each QR carries a small shard, so cameras scan cleanly. The receiver reassembles the burst and merges only new records.
        </p>
      </div>
    </div>
  );
}
