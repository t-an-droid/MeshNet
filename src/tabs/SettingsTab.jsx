import { useState } from 'react';
import { regenerateIdentity, clearMessages, pruneExpired } from '../store';
import { Capacitor } from '@capacitor/core';

export default function SettingsTab({ identity, onIdentityChange, onClear, showToast, onInstall }) {
  const isIOS = Capacitor.getPlatform() === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleRegenerate = () => {
    regenerateIdentity();
    onIdentityChange();
    showToast("Session reset");
  };

  const handleClear = () => {
    clearMessages();
    onClear();
    showToast("History wiped");
  };

  const handlePrune = () => {
    pruneExpired();
    onClear();
    showToast("Expired records purged");
  };

  const copyId = () => {
    navigator.clipboard.writeText(identity.id);
    showToast("ID copied");
  };
  return (
    <div className="space-y-10 pb-20">
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-2">Node Identity</h3>
        
        <div className="bg-white border border-[#edf2f7] rounded-[24px] p-8 space-y-8 shadow-sm">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-[#f1f2f6] rounded-[28px] flex items-center justify-center text-[#5a6b7d] text-2xl font-bold shadow-inner">
              #
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-[#2d3436]">Anonymous Node</h2>
              <p className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest">ID: {identity.id}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#edf2f7]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest">Privacy Mode</span>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Active</span>
            </div>
            <p className="text-[11px] text-[#636e72] leading-relaxed">
              Your identity is purely cryptographic. No names or profile data are stored or shared over the mesh.
            </p>
          </div>
          
          <button 
            onClick={handleRegenerate}
            className="w-full text-[10px] font-bold text-[#d63031] uppercase tracking-widest bg-red-50 py-3 rounded-xl"
          >
            Reset Node Session
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-2">Hardware Storage</h3>
        <div className="bg-white p-8 border border-[#edf2f7] rounded-[32px] shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="max-w-[70%]">
              <div className="text-sm font-bold text-[#2d3436]">Prune Memory</div>
              <div className="text-[10px] text-[#636e72] font-bold uppercase tracking-tight leading-relaxed">Remove all expired records from local node hardware.</div>
            </div>
            <button onClick={handlePrune} className="px-5 py-2.5 bg-[#f1f2f6] text-[#5a6b7d] rounded-xl text-[10px] font-bold uppercase tracking-wider">Execute</button>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="max-w-[70%]">
              <div className="text-sm font-bold text-[#d63031]">Mass Wipe</div>
              <div className="text-[10px] text-[#636e72] font-bold uppercase tracking-tight leading-relaxed">Irreversibly delete all local mesh packet history.</div>
            </div>
            <button onClick={handleClear} className="px-5 py-2.5 bg-red-50 text-[#d63031] rounded-xl text-[10px] font-bold uppercase tracking-wider">Full Wipe</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-2">Client Resilience</h3>
        <div className="bg-white p-8 border border-[#edf2f7] rounded-[32px] shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="max-w-[65%]">
              <div className="text-sm font-bold text-[#2d3436]">Download Client</div>
              <div className="text-[10px] text-[#636e72] font-bold uppercase tracking-tight leading-relaxed">Enable full blackout communication by saving MeshNet to hardware.</div>
            </div>
            <button 
              onClick={onInstall}
              className="flex-1 py-3.5 bg-[#5a6b7d] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-[#5a6b7d]/10"
            >
              Download
            </button>
          </div>
        </div>
      </div>

      {isIOS && (
        <div className="mx-2 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <div>
            <div className="text-xs font-bold text-amber-900 uppercase tracking-tight">iOS Compatibility Note</div>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed mt-1">
              Native P2P not available on iOS. Use QR relay for device-to-device sync.
            </p>
          </div>
        </div>
      )}

      <div className="pt-10 flex flex-col items-center space-y-2 opacity-30">
        <div className="text-[10px] font-bold text-[#636e72] uppercase tracking-[0.4em]">MeshRelief Open Protocol</div>
        <div className="text-[9px] font-mono text-[#636e72] uppercase">v2.0.7-ROUNDED</div>
        <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-[#636e72] uppercase tracking-[0.1em]">Identity Hidden</span>
            <span className="text-[9px] font-mono text-[#5a6b7d] font-bold">NODE #{identity.id}</span>
        </div>
      </div>
    </div>
  );
}
