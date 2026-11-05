async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getDashboard: () => request('/api/calls/dashboard'),
  getContacts: () => request('/api/contacts'),
  createContact: (body) => request('/api/contacts', { method: 'POST', body: JSON.stringify(body) }),
  uploadContacts: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/contacts/upload', { method: 'POST', body: form });
  },
  getCampaigns: () => request('/api/campaigns'),
  getCampaign: (id) => request(`/api/campaigns/${id}`),
  createCampaign: (body) =>
    request('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  startCampaign: (id) => request(`/api/campaigns/${id}/start`, { method: 'POST', body: '{}' }),
  getTracks: () => request('/api/tracks'),
  getTrack: (id) => request(`/api/tracks/${id}`),
  updateTrack: (id, body) =>
    request(`/api/tracks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getResults: (campaignId) =>
    request(campaignId ? `/api/calls/results?campaignId=${campaignId}` : '/api/calls/results'),
  getCall: (id) => request(`/api/calls/${id}`),
  startCall: (body) => request('/api/calls/start', { method: 'POST', body: JSON.stringify(body) }),
  replyToCall: (id, body) =>
    request(`/api/calls/${id}/reply`, { method: 'POST', body: JSON.stringify(body) }),
  getVoiceStatus: () => request('/api/voice/status'),
};

/** Fetch MP3 from server-side ElevenLabs proxy and play in browser. */
export async function speakAgentLine(text, { signal } = {}) {
  const res = await fetch('/api/voice/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Voice failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Audio playback failed'));
      audio.play().catch(reject);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(amount) || 0
  );
}

export function formatOutcome(outcome) {
  if (!outcome) return '—';
  return outcome
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
