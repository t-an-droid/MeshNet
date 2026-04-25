import { useEffect, useState } from 'react';
import { getIdentity, decryptText } from '../store';
import React from 'react';

function ExpiryBadge({ expiresAt, now }) {
  if (!expiresAt) return null;
  const diff = expiresAt - now;
  if (diff <= 0) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#d63031] text-white uppercase tracking-wider">
        Expired
      </span>
    );
  }
  const isSoon = diff < 1800000; // 30 minutes
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const label = hours > 0 ? `Expires in ${hours}h` : `Expires in ${minutes}m`;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${
      isSoon ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' : 'bg-[#ffeaa7] text-[#636e72]'
    }`}>
      {isSoon && <span className="mr-1">⚠</span>}
      {label}
    </span>
  );
}

function DecryptedText({ msg, myId }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;
    if (msg.recipientId) {
      if (msg.recipientId === myId) {
        decryptText(msg.text, myId).then(res => {
          if (active) setContent(res);
        });
      } else {
        setContent('[Encrypted Message]');
      }
    } else {
      setContent(msg.text);
    }
    return () => { active = false; };
  }, [msg.text, msg.recipientId, myId]);

  if (content === null) return <div className="h-4 w-32 bg-[#f1f2f6] animate-pulse rounded"></div>;

  if (msg.type === 'Safe Route' && content !== '[Encrypted Message]') {
    const parts = content.split('\n---\n');
    const header = parts[0];
    const body = parts[1] || '';
    
    const fromMatch = header.match(/FROM: (.*)/);
    const toMatch = header.match(/TO: (.*)/);
    const hazardsMatch = header.match(/HAZARDS: (.*)/);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-green-50/50 rounded-xl border border-green-100">
             <span className="block text-[8px] font-bold text-green-700 uppercase tracking-tighter">From</span>
             <span className="text-xs font-bold text-green-900 leading-tight">{fromMatch ? fromMatch[1] : '...'}</span>
          </div>
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
             <span className="block text-[8px] font-bold text-blue-700 uppercase tracking-tighter">To</span>
             <span className="text-xs font-bold text-blue-900 leading-tight">{toMatch ? toMatch[1] : '...'}</span>
          </div>
        </div>
        {hazardsMatch && hazardsMatch[1] && (
          <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
             <span className="block text-[8px] font-bold text-amber-700 uppercase tracking-tighter">Route Hazards</span>
             <span className="text-[11px] text-amber-900 font-medium">{hazardsMatch[1]}</span>
          </div>
        )}
        <p className="text-[14px] text-[#2d3436] leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>
    );
  }

  return <p className="text-[14px] text-[#2d3436] leading-relaxed whitespace-pre-wrap">{content}</p>;
}

export default function FeedTab({ messages, onUseToken }) {
  const [filter, setFilter] = useState('All messages');
  const [now, setNow] = useState(() => Date.now());
  const { id: myId } = getIdentity();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filtered = messages.filter(m => {
    if (filter === 'Urgent only') return m.isUrgent;
    if (filter === 'Private') return m.recipientId;
    if (filter !== 'All messages') return m.type === filter;
    return true;
  });

  const getIcon = (type, isUrgent) => {
    if (isUrgent) return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>;
    if (type === 'Medical Aid') return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>;
    if (type === 'Safe Route') return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m-6 3l6-3"></path></svg>;
    if (type === 'Alert') return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>;
    return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {['All messages', 'Urgent only', 'Alert', 'Safe Route', 'Medical Aid', 'Private'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              filter === f 
                ? 'bg-[#2d3436] text-white' 
                : 'bg-white text-[#636e72] border border-[#edf2f7] hover:bg-[#f9fbfc]'
            }`}
          >
            {filter === f && <div className="w-1 h-1 bg-white rounded-full"></div>}
            {f === 'All messages' ? 'Broadcast' : f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#edf2f7] rounded-3xl flex flex-col items-center gap-4">
          <svg className="w-8 h-8 text-[#edf2f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          <p className="text-[10px] font-bold text-[#636e72] uppercase tracking-[0.2em]">Silence on the mesh</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(msg => {
            const isToMe = msg.recipientId === myId;
            return (
              <div 
                key={msg.id} 
                className={`p-6 rounded-[24px] border transition-all ${
                  msg.isUrgent 
                    ? 'border-[#fab1a0] bg-[#fff9f8]' 
                    : isToMe 
                      ? 'border-[#74b9ff] bg-[#f0f7ff]' 
                      : 'bg-white border-[#edf2f7] shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5 ${
                        msg.isUrgent ? 'bg-[#d63031] text-white' : 'bg-[#f1f2f6] text-[#636e72]'
                      }`}>
                        {getIcon(msg.type, msg.isUrgent)}
                        {msg.isUrgent ? 'Priority' : msg.type}
                      </span>
                      {msg.recipientId && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isToMe ? 'text-[#0984e3]' : 'text-[#636e72]'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                          {isToMe ? 'Private to you' : `To node ${msg.recipientId}`}
                        </span>
                      )}
                      <ExpiryBadge expiresAt={msg.expiresAt} now={now} />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#636e72] font-bold opacity-60 uppercase">{msg.hops} Hops</span>
                </div>
                
                <DecryptedText msg={msg} myId={myId} />

                {msg.hops > 0 && (
                  <div className="mt-5 pt-4 border-t border-black/5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {Array.from({ length: Math.min(msg.hops + 1, 6) }).map((_, i) => (
                        <React.Fragment key={i}>
                          <div className={`w-1.5 h-1.5 rounded-full ${i === msg.hops ? 'bg-[#5a6b7d]' : 'bg-[#5a6b7d]/30'}`} />
                          {i < Math.min(msg.hops, 5) && (
                            <svg className="w-2 h-2 text-[#5a6b7d]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                          )}
                        </React.Fragment>
                      ))}
                      {msg.hops > 5 && <span className="text-[8px] font-bold text-[#636e72]/40">+</span>}
                    </div>
                    <span className="text-[9px] font-bold text-[#636e72] uppercase tracking-widest opacity-60">Relayed via {msg.hops} node{msg.hops > 1 ? 's' : ''}</span>
                  </div>
                )}
                {msg.type === 'Handshake Token' && onUseToken && (
                  <button
                    onClick={() => onUseToken(msg.text)}
                    className="mt-3 w-full py-3 bg-[#f0f7ff] border border-[#74b9ff]/30 text-[#0984e3] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#e3f0ff] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    Use as Handshake Token
                  </button>
                )}
                
                <div className="mt-6 pt-4 border-t border-black/5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#636e72] uppercase tracking-[0.1em] truncate max-w-[120px]">
                      Node #{msg.senderId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#636e72] font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
