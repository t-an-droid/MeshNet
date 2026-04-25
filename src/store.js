import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'meshnet_messages';
const ID_KEY = 'meshnet_id';
const NAME_KEY = 'meshnet_name';

async function deriveKey(nodeId) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(nodeId));
  return await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(text, nodeId) {
  try {
    const key = await deriveKey(nodeId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return 'ENC:' + btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

export async function decryptText(encryptedBase64, nodeId) {
  if (!encryptedBase64.startsWith('ENC:')) return encryptedBase64;
  try {
    const combined = new Uint8Array(atob(encryptedBase64.slice(4)).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveKey(nodeId);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return '[Encrypted Message]';
  }
}

export const getIdentity = () => {
  try {
    const saved = localStorage.getItem(ID_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure it has an ID, otherwise it's legacy
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    console.warn("Legacy identity detected, resetting...");
  }

  const newId = {
    id: Math.random().toString(36).slice(2, 10).toUpperCase(),
    joinedAt: new Date().toISOString()
  };
  localStorage.setItem(ID_KEY, JSON.stringify(newId));
  return newId;
};

export const updateIdentity = (updates) => {
  const current = getIdentity();
  // We no longer accept names, only other internal updates if any
  const updated = { ...current, ...updates };
  localStorage.setItem(ID_KEY, JSON.stringify(updated));
  return updated;
};

export const regenerateIdentity = () => {
  const newId = {
    id: Math.random().toString(36).slice(2, 10).toUpperCase(),
    joinedAt: new Date().toISOString()
  };
  localStorage.setItem(ID_KEY, JSON.stringify(newId));
  return newId;
};

export const getMessages = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveMessages = (msgs) => {
  // Prune messages older than their expiry if set
  const now = Date.now();
  const validMsgs = msgs.filter(m => !m.expiresAt || m.expiresAt > now);
  validMsgs.sort((a, b) => b.timestamp - a.timestamp);
  const trimmed = validMsgs.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const clearMessages = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
};

export const pruneExpired = () => {
  return saveMessages(getMessages());
};

export const addMessage = async ({ text, type = 'Info', isUrgent = false, expiresAt = null, recipientId = null }) => {
  const msgs = getMessages();
  const { id: senderId } = getIdentity();
  
  let finalText = text;
  if (recipientId) {
    finalText = await encryptText(text, recipientId);
  }

  const newMessage = {
    id: uuidv4().slice(0, 8),
    text: finalText,
    type,
    isUrgent,
    expiresAt,
    recipientId,
    timestamp: Date.now(),
    senderId,
    hops: 0,
  };
  
  msgs.push(newMessage);
  return saveMessages(msgs);
};

export const mergeMessages = (incomingMsgs) => {
  if (!Array.isArray(incomingMsgs)) return { updated: getMessages(), added: 0 };
  
  const localMsgs = getMessages();
  const localIds = new Set(localMsgs.map(m => m.id));
  
  let added = 0;
  const myId = getIdentity().id;

  for (const msg of incomingMsgs) {
    // PRIVACY FILTER: If it's a DM, only import if I am the sender or recipient
    if (msg.recipientId && msg.recipientId !== myId && msg.senderId !== myId) {
      continue; 
    }

    // Only accept if less than 3 hops, or it's urgent
    const maxHops = msg.isUrgent ? 10 : 3;
    if (!localIds.has(msg.id) && (msg.hops || 0) < maxHops) {
      localMsgs.push({ ...msg, hops: (msg.hops || 0) + 1 });
      added++;
    }
  }
  
  if (added > 0) {
    return { updated: saveMessages(localMsgs), added };
  }
  return { updated: localMsgs, added: 0 };
};

export const getSyncPayload = (charBudget = 600, selectedIds = null) => {
  const msgs = getMessages();
  const now = Date.now();
  
  // Filter active messages
  let active = msgs.filter(m => !m.expiresAt || m.expiresAt > now);
  
  // If user selected specific messages, ONLY use those
  if (selectedIds && selectedIds.length > 0) {
    active = active.filter(m => selectedIds.includes(m.id));
  }

  // Format: [id, text, type, isUrgent(1/0), expiresAt, timestamp, senderId, senderName(empty), hops, recipientId]
  const payload = [];
  for (const m of active) {
    const entry = [
      m.id,
      m.text,
      m.type,
      m.isUrgent ? 1 : 0,
      m.expiresAt || 0,
      m.timestamp,
      m.senderId,
      '', // senderName is now empty for privacy
      m.hops,
      m.recipientId
    ];
    const candidate = JSON.stringify([...payload, entry]);
    if (candidate.length > charBudget) break;
    payload.push(entry);
  }
  return JSON.stringify(payload);
};

export const parseSyncPayload = (payloadStr) => {
  try {
    const data = JSON.parse(payloadStr);
    if (!Array.isArray(data)) return [];
    return data.map(m => ({
      id: m[0],
      text: m[1],
      type: m[2],
      isUrgent: m[3] === 1,
      expiresAt: m[4] === 0 ? null : m[4],
      timestamp: m[5],
      senderId: m[6],
      senderName: m[7],
      hops: m[8],
      recipientId: m[9] || null,
    }));
  } catch {
    return [];
  }
};
