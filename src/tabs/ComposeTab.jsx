import { useState } from 'react';
import { addMessage } from '../store';

export default function ComposeTab({ onPublish, showToast }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('General Info');
  const [recipientId, setRecipientId] = useState('');
  const [expiresIn, setExpiresIn] = useState('Never');
  const [isUrgent, setIsUrgent] = useState(false);
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [hazards, setHazards] = useState('');

  const handlePublish = async (overrideParams = {}) => {
    if (!text.trim() && !overrideParams.isEmergency && type !== 'Safe Route') return;
    if (type === 'Safe Route' && (!fromLoc.trim() || !toLoc.trim())) {
      showToast("From/To locations required", true);
      return;
    }
    
    let expiresAt = null;
    if (expiresIn === '1 Hour') expiresAt = Date.now() + 3600000;
    if (expiresIn === '6 Hours') expiresAt = Date.now() + 21600000;
    if (expiresIn === '24 Hours') expiresAt = Date.now() + 86400000;
    if (expiresIn === '48 Hours') expiresAt = Date.now() + 172800000;
    if (expiresIn === '72 Hours') expiresAt = Date.now() + 259200000;
    
    let finalPayloadText = text;
    if (type === 'Safe Route') {
      finalPayloadText = `FROM: ${fromLoc}\nTO: ${toLoc}\nHAZARDS: ${hazards}\n---\n${text}`;
    }

    const finalParams = {
      text: finalPayloadText,
      type,
      isUrgent,
      expiresAt,
      recipientId: type === 'Direct Message' ? recipientId.trim().toUpperCase() : null,
      ...overrideParams
    };
    
    await addMessage(finalParams);
    setText('');
    setRecipientId('');
    setIsUrgent(false);
    setType('General Info');
    setFromLoc('');
    setToLoc('');
    setHazards('');
    setExpiresIn('Never');
    onPublish();
    showToast(finalParams.isUrgent ? 'Priority Broadcast Dispatched' : 'Message Dispatched');
  };

  const handleEmergency = () => {
    if (!text.trim()) {
      showToast("Message required");
      return;
    }
    handlePublish({
      type: 'Alert',
      isUrgent: true,
      expiresAt: null,
      isEmergency: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#f1f2f6] p-5 rounded-2xl text-[#636e72] text-[11px] leading-relaxed font-medium flex items-start gap-3">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>All records are decentralized and replicated across the mesh. Priority alerts have precedence in the relay buffer.</span>
      </div>

      <div className="space-y-4 bg-white p-6 border border-[#edf2f7] rounded-[24px] shadow-sm">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">Classification</label>
          <div className="relative">
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full p-4 bg-[#f9fbfc] border border-[#edf2f7] text-[#2d3436] text-sm rounded-xl outline-none appearance-none cursor-pointer font-semibold"
            >
              <option value="General Info">General Broadcast</option>
              <option value="Alert">Network Alert</option>
              <option value="Safe Route">Safe Logistics</option>
              <option value="Medical Aid">Medical Support</option>
              <option value="Direct Message">Direct Message</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#636e72]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        
        {type === 'Direct Message' && (
          <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
            <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">Recipient Node</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="000000X"
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                className="w-full p-4 pl-11 text-sm border border-[#edf2f7] rounded-xl outline-none focus:border-[#74b9ff] uppercase font-mono font-bold bg-[#f9fbfc]"
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#636e72]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
            </div>
          </div>
        )}
        
        {type === 'Safe Route' && (
          <div className="space-y-4 animate-in slide-in-from-top-2 fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">From</label>
                <input 
                  type="text" 
                  value={fromLoc}
                  onChange={e => setFromLoc(e.target.value)}
                  className="w-full p-3 text-sm border border-[#edf2f7] rounded-xl outline-none bg-[#f9fbfc]"
                  placeholder="Starting point"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">To</label>
                <input 
                  type="text" 
                  value={toLoc}
                  onChange={e => setToLoc(e.target.value)}
                  className="w-full p-3 text-sm border border-[#edf2f7] rounded-xl outline-none bg-[#f9fbfc]"
                  placeholder="Destination"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">Hazards</label>
              <textarea 
                value={hazards}
                onChange={e => setHazards(e.target.value)}
                className="w-full p-3 text-sm border border-[#edf2f7] rounded-xl outline-none bg-[#f9fbfc] h-20 resize-none"
                placeholder="List known dangers..."
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">Payload Content</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={3000}
            className="w-full p-4 border border-[#edf2f7] rounded-xl bg-[#f9fbfc] outline-none focus:border-[#74b9ff] min-h-[140px] resize-none text-[14px]"
            placeholder="Type your message..."
          ></textarea>
          <div className="text-right text-[10px] text-[#636e72] font-bold mono">
            {text.length}/3000
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#636e72] uppercase tracking-widest ml-1">Expiry Period</label>
          <div className="relative">
            <select 
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              className="w-full p-4 bg-[#f9fbfc] border border-[#edf2f7] text-[#2d3436] text-sm rounded-xl outline-none appearance-none cursor-pointer font-semibold"
            >
              <option value="Never">Persistent (No Expiry)</option>
              <option value="1 Hour">1 Hour</option>
              <option value="6 Hours">6 Hours</option>
              <option value="24 Hours">24 Hours</option>
              <option value="48 Hours">48 Hours</option>
              <option value="72 Hours">72 Hours</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#636e72]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center p-5 bg-white border border-[#edf2f7] rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#d63031]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <div className="text-sm font-bold text-[#2d3436]">Elevate Priority</div>
            <div className="text-[10px] text-[#636e72] font-bold uppercase tracking-tight">Immediate relay precedence</div>
          </div>
        </div>
        <button 
          onClick={() => setIsUrgent(!isUrgent)}
          className={`w-12 h-6 rounded-full transition-colors relative ${isUrgent ? 'bg-[#5a6b7d]' : 'bg-[#e0e0e0]'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${isUrgent ? 'left-6.5' : 'left-0.5'}`} style={{ left: isUrgent ? '26px' : '2px' }}></div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => handlePublish()}
          disabled={!text.trim()}
          className="w-full py-4 bg-[#5a6b7d] text-white rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5a6b7d]/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          Inject Broadcast
        </button>
        <button 
          onClick={handleEmergency}
          className="w-full py-4 text-[#d63031] font-bold text-sm uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          Emergency Signal
        </button>
      </div>
    </div>
  );
}
