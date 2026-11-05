import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

function getCampaignDetail(id) {
  const campaign = db
    .prepare(
      `SELECT c.*, t.name AS track_name
       FROM campaigns c
       JOIN tracks t ON t.id = c.track_id
       WHERE c.id = ?`
    )
    .get(id);
  if (!campaign) return null;

  const contacts = db
    .prepare(
      `SELECT cc.call_status, ct.id, ct.name, ct.phone, ct.account_number, ct.loan_amount
       FROM campaign_contacts cc
       JOIN contacts ct ON ct.id = cc.contact_id
       WHERE cc.campaign_id = ?
       ORDER BY cc.id ASC`
    )
    .all(id);

  const stats = {
    total: contacts.length,
    queued: contacts.filter((c) => c.call_status === 'queued').length,
    in_progress: contacts.filter((c) => c.call_status === 'in_progress').length,
    completed: contacts.filter((c) => c.call_status === 'completed').length,
  };

  return { ...campaign, contacts, stats };
}

router.get('/', (_req, res) => {
  const campaigns = db
    .prepare(
      `SELECT c.*, t.name AS track_name,
        (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id) AS contact_count,
        (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id AND cc.call_status = 'queued') AS queued_count,
        (SELECT COUNT(*) FROM campaign_contacts cc WHERE cc.campaign_id = c.id AND cc.call_status = 'completed') AS completed_count
       FROM campaigns c
       JOIN tracks t ON t.id = c.track_id
       ORDER BY c.id DESC`
    )
    .all();
  res.json(campaigns);
});

router.get('/:id', (req, res) => {
  const campaign = getCampaignDetail(Number(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});

router.post('/', (req, res) => {
  const { name, track_id, contact_ids = [] } = req.body || {};
  if (!name || !track_id) {
    return res.status(400).json({ error: 'name and track_id are required' });
  }

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(Number(track_id));
  if (!track) return res.status(400).json({ error: 'Invalid track_id' });

  const txn = db.transaction(() => {
    const result = db
      .prepare(`INSERT INTO campaigns (name, track_id, status) VALUES (?, ?, 'draft')`)
      .run(name, Number(track_id));
    const campaignId = result.lastInsertRowid;

    const link = db.prepare(
      `INSERT OR IGNORE INTO campaign_contacts (campaign_id, contact_id, call_status)
       VALUES (?, ?, 'queued')`
    );
    for (const contactId of contact_ids) {
      const exists = db.prepare('SELECT id FROM contacts WHERE id = ?').get(Number(contactId));
      if (exists) link.run(campaignId, Number(contactId));
    }
    return campaignId;
  });

  const campaignId = txn();
  res.status(201).json(getCampaignDetail(campaignId));
});

router.post('/:id/start', (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  db.prepare(`UPDATE campaigns SET status = 'active' WHERE id = ?`).run(id);
  res.json(getCampaignDetail(id));
});

router.post('/:id/contacts', (req, res) => {
  const id = Number(req.params.id);
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const { contact_ids = [] } = req.body || {};
  const link = db.prepare(
    `INSERT OR IGNORE INTO campaign_contacts (campaign_id, contact_id, call_status)
     VALUES (?, ?, 'queued')`
  );
  const txn = db.transaction((ids) => {
    for (const contactId of ids) {
      const exists = db.prepare('SELECT id FROM contacts WHERE id = ?').get(Number(contactId));
      if (exists) link.run(id, Number(contactId));
    }
  });
  txn(contact_ids);
  res.json(getCampaignDetail(id));
});

export default router;
