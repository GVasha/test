import { Router } from 'express';
import { getVoiceConfig, isElevenLabsConfigured, synthesizeSpeech } from '../services/elevenlabs.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getVoiceConfig());
});

router.post('/speak', async (req, res) => {
  try {
    if (!isElevenLabsConfigured()) {
      return res.status(503).json({ error: 'ElevenLabs API key not configured' });
    }
    const { text } = req.body || {};
    const audio = await synthesizeSpeech(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(audio);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
