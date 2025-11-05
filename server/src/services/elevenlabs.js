const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const DEFAULT_MODEL_ID = 'eleven_turbo_v2_5';
const LEGACY_LIBRARY_VOICE_IDS = new Set(['21m00Tcm4TlvDq8ikWAM']);

let resolvedVoiceId = null;

export function isElevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export function getVoiceConfig() {
  return {
    configured: isElevenLabsConfigured(),
    voiceId: resolvedVoiceId || preferredVoiceId(),
    modelId: process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
  };
}

function preferredVoiceId() {
  const configured = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (configured && !LEGACY_LIBRARY_VOICE_IDS.has(configured)) return configured;
  return DEFAULT_VOICE_ID;
}

function errorDetail(errJson, fallback) {
  if (!errJson) return fallback;
  if (typeof errJson.detail === 'string') return errJson.detail;
  if (errJson.detail?.message) return errJson.detail.message;
  return JSON.stringify(errJson.detail || errJson);
}

function isLibraryVoiceError(status, detail) {
  return status === 402 && /library voice/i.test(String(detail || ''));
}

async function listAccountVoiceIds(apiKey) {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.voices || [])
    .map((voice) => voice.voice_id)
    .filter((id) => id && !LEGACY_LIBRARY_VOICE_IDS.has(id));
}

async function requestSpeech(apiKey, voiceId, modelId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = errorDetail(await res.json(), detail);
    } catch {
      /* ignore */
    }
    const error = new Error(`ElevenLabs TTS failed (${res.status}): ${detail}`);
    error.status = res.status;
    error.detail = detail;
    throw error;
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function synthesizeSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ElevenLabs is not configured. Set ELEVENLABS_API_KEY in .env');
  }

  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('Text is required for speech synthesis');
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const candidates = [];
  if (resolvedVoiceId) candidates.push(resolvedVoiceId);
  candidates.push(preferredVoiceId());

  const seen = new Set();
  let lastError = null;

  async function tryVoice(voiceId) {
    if (!voiceId || seen.has(voiceId)) return null;
    seen.add(voiceId);
    try {
      const audio = await requestSpeech(apiKey, voiceId, modelId, trimmed);
      resolvedVoiceId = voiceId;
      return audio;
    } catch (err) {
      lastError = err;
      if (!isLibraryVoiceError(err.status, err.detail)) throw err;
      console.warn(`[collecta] ElevenLabs voice ${voiceId} is blocked on this plan`);
      return null;
    }
  }

  for (const voiceId of candidates) {
    const audio = await tryVoice(voiceId);
    if (audio) return audio;
  }

  const accountVoices = await listAccountVoiceIds(apiKey);
  for (const voiceId of accountVoices) {
    const audio = await tryVoice(voiceId);
    if (audio) {
      console.log(`[collecta] using ElevenLabs voice ${voiceId}`);
      return audio;
    }
  }

  throw lastError || new Error('ElevenLabs could not speak with any available voice');
}
