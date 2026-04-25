import { useEffect, useState } from 'react';
import {
  getIdentity,
  getMessages,
  getSyncPayload,
  mergeMessages,
  parseSyncPayload
} from './store';

import FeedTab from './tabs/FeedTab';
import ComposeTab from './tabs/ComposeTab';
import NearbyTab from './tabs/NearbyTab';
import QrDropTab from './tabs/QrDropTab';
import SettingsTab from './tabs/SettingsTab';

function App() {
  const [activeTab, setActiveTab] = useState('FEED');
  const [messages, setMessages] = useState(() => getMessages());
  const [identity, setIdentity] = useState(getIdentity());
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstallingSW, setIsInstallingSW] = useState(false);
  const [isSecure, setIsSecure] = useState(window.isSecureContext);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    setMessages(getMessages());
    setIdentity(getIdentity());
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      showToast('App is already installed or not supported on this browser.', true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      showToast('Installing MeshNet...');
    }
  };

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    let channel;

    if (window.BroadcastChannel) {
      channel = new BroadcastChannel('meshnet_sync');
      channel.onmessage = (event) => {
        if (event.data === 'sync_request') {
          channel.postMessage({ type: 'sync_data', payload: getSyncPayload() });
          return;
        }

        if (event.data?.type === 'sync_data') {
          const incomingMsgs = parseSyncPayload(event.data.payload);
          const res = mergeMessages(incomingMsgs);
          if (res.added > 0) showToast(`Synced ${res.added} messages`);
          loadData();
        }
      };
      channel.postMessage('sync_request');
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SW Install Check
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          const checkState = (sw) => {
            sw.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') {
                setIsInstallingSW(false);
                showToast("Mesh Cache Ready");
              }
            });
          };
          if (reg.installing) {
            setIsInstallingSW(true);
            checkState(reg.installing);
          }
          reg.addEventListener('updatefound', () => {
            setIsInstallingSW(true);
            if (reg.installing) checkState(reg.installing);
          });
        }
      });
    }

    const secInterval = setInterval(() => {
      setIsSecure(window.isSecureContext);
    }, 2000);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(secInterval);
    };
  }, []);

  const handleManualSync = () => {
    loadData();
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('meshnet_sync');
      channel.postMessage('sync_request');
      channel.close();
    }
    showToast('Sync triggered');
  };

  const handlePublishSuccess = () => {
    loadData();
  };

  const tabs = ['FEED', 'COMPOSE', 'NEARBY', 'QR DROP', 'SETTINGS'];

  return (
    <div className="h-full flex flex-col w-full bg-mesh relative text-[#2d3436]">
      {isOffline && (
        <div className="bg-green-600 text-white text-[10px] font-bold py-1 px-4 text-center uppercase tracking-widest z-[60]">
          OFFLINE MODE — Mesh Active
        </div>
      )}
      {!isSecure && (
        <div className="bg-red-600 text-white text-[10px] font-bold py-1 px-4 text-center uppercase tracking-widest z-[60]">
          INSECURE CONTEXT — Camera & Sync Disabled
        </div>
      )}
      {isInstallingSW && (
        <div className="bg-[#5a6b7d] text-white text-[10px] font-bold py-1 px-4 text-center uppercase tracking-widest animate-pulse z-[60]">
          Caching Mesh Assets...
        </div>
      )}
      {toast && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-3 bg-white border shadow-xl rounded-2xl animate-in slide-in-from-right-4 fade-in ${toast.isError ? 'border-[#fab1a0] text-[#d63031]' : 'border-[#edf2f7]'}`}>
          <div className="text-sm font-semibold tracking-tight">{toast.message}</div>
        </div>
      )}

      <header className="flex flex-col bg-white/60 backdrop-blur-md border-b border-[#edf2f7] z-10">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h1 className="text-xl font-bold tracking-tight">MeshNet</h1>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-[#636e72] uppercase tracking-[0.1em]">Identity Hidden</span>
            <span className="text-[9px] font-mono text-[#5a6b7d] font-bold">NODE #{identity.id}</span>
          </div>
        </div>

        <nav className="flex px-6 text-sm font-medium text-[#636e72] overflow-x-auto hide-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-4 whitespace-nowrap transition-all relative ${
                activeTab === tab ? 'tab-btn-active' : 'tab-btn hover:text-[#2d3436]'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="max-w-xl mx-auto space-y-6">
          {activeTab === 'FEED' && <FeedTab messages={messages} />}
          {activeTab === 'COMPOSE' && <ComposeTab onPublish={handlePublishSuccess} showToast={showToast} />}
          {activeTab === 'NEARBY' && <NearbyTab showToast={showToast} onSync={handlePublishSuccess} />}
          {activeTab === 'QR DROP' && <QrDropTab onSync={handlePublishSuccess} showToast={showToast} />}
          {activeTab === 'SETTINGS' && (
            <SettingsTab
              identity={identity}
              onIdentityChange={loadData}
              onClear={loadData}
              showToast={showToast}
              onInstall={installApp}
            />
          )}
        </div>
      </main>

      <footer className="absolute bottom-6 left-6 right-6 h-16 bg-white/80 backdrop-blur-md border border-[#edf2f7] rounded-2xl flex justify-between items-center px-6 z-10 shadow-lg shadow-black/5">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#636e72] uppercase tracking-widest">Node Session</span>
          <span className="text-[11px] font-bold mono text-[#2d3436]">#{identity.id} / {messages.length} Records</span>
        </div>
        <button
          onClick={handleManualSync}
          className="bg-[#5a6b7d] text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#5a6b7d]/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Sync Mesh
        </button>
      </footer>
    </div>
  );
}

export default App;
