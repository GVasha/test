import { Router } from 'express';
import {
  getCall,
  getDashboardStats,
  listResults,
  replyToCall,
  startCall,
} from '../services/callSimulator.js';

const router = Router();

router.get('/dashboard', (_req, res) => {
  res.json(getDashboardStats());
});

router.get('/results', (req, res) => {
  const campaignId = req.query.campaignId ? Number(req.query.campaignId) : undefined;
  res.json(listResults({ campaignId }));
});

router.get('/:id', (req, res) => {
  const call = getCall(Number(req.params.id));
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
});

router.post('/start', (req, res) => {
  try {
    const { campaignId, contactId } = req.body || {};
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });
    const call = startCall({
      campaignId: Number(campaignId),
      contactId: contactId != null ? Number(contactId) : undefined,
    });
    res.status(201).json(call);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/reply', (req, res) => {
  try {
    const { choiceId, replyText } = req.body || {};
    const call = replyToCall(Number(req.params.id), { choiceId, replyText });
    res.json(call);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
