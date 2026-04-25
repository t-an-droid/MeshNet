import { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { getMessages, getSyncPayload, parseSyncPayload, mergeMessages } from '../store';

const FRAME_CHARS = 300;
const FRAME_MS = 800;

const makeTransferId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const makeFrames = (payload) => {
  if (payload.length <= FRAME_CHARS) return [payload];
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

export default function QrDropTab({ onSync, showToast }) {
  const [scannerActive, setScannerActive] = useState(false);
  const [payload, setPayload] = useState(getSyncPayload());
  const [frameIndex, setFrameIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState({ count: 0, total: 0 });
  const [selectedMsgs, setSelectedMsgs] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const scannerRef = useRef(null);
  const collectedRef = useRef(new Map());
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const allMessages = getMessages();

  const frames = useMemo(() => makeFrames(payload), [payload]);

  useEffect(() => {
    if (frames.length <= 1) return undefined;
    const timer = setInterval(() => {
      setFrameIndex(curr => (curr + 1) % frames.length);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [frames.length]);

  useEffect(() => {
    setPayload(getSyncPayload());
  }, []);

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
      setScanProgress({ total: frame.total, count: bucket.size });

      if (bucket.size === frame.total) {
        const assembled = Array.from({ length: frame.total }, (_, i) => bucket.get(i)).join('');
        collectedRef.current.clear();
        setScanProgress({ count: 0, total: 0 });
        stopScanning();
        importPayload(assembled);
      }
    } catch {
      importPayload(decodedText);
      stopScanning();
    }
  };

  const importPayload = (data) => {
    try {
      const incomingMsgs = parseSyncPayload(data);
      const res = mergeMessages(incomingMsgs);
      if (res.added > 0) {
        showToast(`Imported ${res.added} messages`);
        onSync();
      } else {
        showToast("Already up to date");
      }
    } catch {
      showToast("Invalid mesh token", true);
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
        showToast("Camera blocked. Please check permissions.", true);
        setScannerActive(false);
      }
    };

    startCamera();

    return () => {
      if (scannerRef.current) scannerRef.current.stop();
    };
  }, [scannerActive]);

  const startScanning = () => {
    setScannerActive(true);
    setScanProgress({ count: 0, total: 0 });
    collectedRef.current.clear();
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const codeReader = new BrowserQRCodeReader();
    try {
      const result = await codeReader.decodeFromImageElement(URL.createObjectURL(file));
      handleScan(result.getText());
    } catch (err) {
      showToast("No QR detected in image", true);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-[#f1f2f6] p-5 rounded-2xl text-[#636e72] text-[11px] leading-relaxed font-medium">
        Communal Sync: Broadcast your entire node cache through a visual handshake token. Ideal for fully air-gapped data transfers.
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest">Outbound Mesh Token</h3>
          <div className="flex gap-3">
            <button
              onClick={() => { setIsSelecting(!isSelecting); setSelectedMsgs([]); }}
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${isSelecting ? 'bg-[#2d3436] text-white border-[#2d3436]' : 'text-[#5a6b7d] border-[#edf2f7]'}`}
            >
              {isSelecting ? 'Done' : 'Pick Messages'}
            </button>
            <button 
              onClick={() => {
                setPayload(getSyncPayload(600, selectedMsgs.length > 0 ? selectedMsgs : null));
                showToast(selectedMsgs.length > 0 ? `Token: ${selectedMsgs.length} items` : 'Token: All messages');
              }}
              className="text-[10px] font-bold text-[#5a6b7d] uppercase tracking-widest hover:underline"
            >
              Update
            </button>
          </div>
        </div>

        {isSelecting && (
          <div className="bg-white border border-[#edf2f7] rounded-2xl overflow-hidden shadow-sm max-h-60 overflow-y-auto divide-y divide-[#edf2f7]">
            {allMessages.map(m => (
              <div 
                key={m.id} 
                onClick={() => {
                  setSelectedMsgs(prev => prev.includes(m.id) ? prev.filter(i => i !== m.id) : [...prev, m.id]);
                }}
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
          </div>
        )}
        
        <div className="flex flex-col items-center bg-white p-10 border border-[#edf2f7] rounded-[40px] shadow-sm">
          <div className="p-4 bg-white rounded-[32px] border border-[#f9fbfc]">
            <QRCodeSVG 
              value={frames[frameIndex] || '[]'} 
              size={240} 
              level="L" 
              includeMargin={false}
              fgColor="#2d3436"
              bgColor="#ffffff"
            />
          </div>
          {frames.length > 1 && (
            <div className="mt-6 w-full max-w-[200px]">
              <div className="flex justify-between text-[9px] font-bold text-[#636e72] uppercase tracking-widest mb-2">
                <span>Frame {frameIndex + 1}/{frames.length}</span>
                <span>Burst Active</span>
              </div>
              <div className="h-1 bg-[#f1f2f6] rounded-full overflow-hidden">
                <div className="h-full bg-[#5a6b7d]" style={{ width: `${((frameIndex + 1)/frames.length)*100}%` }}></div>
              </div>
            </div>
          )}
          <p className="mt-8 text-[11px] text-[#636e72] font-bold uppercase tracking-widest text-center leading-relaxed opacity-60">
            {frames.length > 1 ? 'Propagating multi-frame burst buffer...' : 'Allow peer nodes to scan this visual handshake token.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest">Inbound Visual Monitor</h3>
        </div>

        {scannerActive ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[32px] border-4 border-white shadow-xl bg-black relative aspect-square">
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
            className="w-full py-16 border-2 border-dashed border-[#edf2f7] rounded-[40px] bg-white text-[#636e72] flex flex-col items-center justify-center gap-3 hover:bg-[#f9fbfc] transition-all shadow-sm"
          >
            <div className="w-12 h-12 bg-[#f1f2f6] rounded-2xl flex items-center justify-center text-[#5a6b7d]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 012 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold uppercase tracking-widest text-[#2d3436]">Visual Handshake</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-40">Scan peer node token</span>
            </div>
          </button>
        )}
      </div>

      <div className="pt-10 border-t border-[#edf2f7] mx-2">
        <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest mb-3">Sync Protocol Note</h3>
        <p className="text-[10px] text-[#636e72] leading-relaxed uppercase tracking-widest font-medium opacity-50">
          Visual tokens are resistant to radio interference. Recommended for high-security coordination.
        </p>
      </div>
    </div>
  );
}
