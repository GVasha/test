const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const DEFAULT_MODEL_ID = 'eleven_turbo_v2_5';

export function isElevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export function getVoiceConfig() {
  return {
    configured: isElevenLabsConfigured(),
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID,
    modelId: process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
  };
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

  const { voiceId, modelId } = getVoiceConfig();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: modelId,
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = await res.json();
      detail = errJson.detail?.message || errJson.detail || JSON.stringify(errJson);
    } catch {
      /* ignore */
    }
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}
