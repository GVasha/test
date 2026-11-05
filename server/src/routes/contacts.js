import { Router } from 'express';
import multer from 'multer';
import db from '../db/index.js';
import { parseContactsCsv } from '../services/csvImport.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const router = Router();

router.get('/', (_req, res) => {
  const contacts = db
    .prepare(
      `SELECT id, name, phone, account_number, loan_amount, status, created_at
       FROM contacts ORDER BY id DESC`
    )
    .all();
  res.json(contacts);
});

router.post('/', (req, res) => {
  const { name, phone, account_number = '', loan_amount = 0 } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }
  const result = db
    .prepare(
      `INSERT INTO contacts (name, phone, account_number, loan_amount, status)
       VALUES (?, ?, ?, ?, 'active')`
    )
    .run(name, phone, account_number, Number(loan_amount) || 0);
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(contact);
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });
    const contacts = parseContactsCsv(req.file.buffer);
    const insert = db.prepare(
      `INSERT INTO contacts (name, phone, account_number, loan_amount, status)
       VALUES (?, ?, ?, ?, 'active')`
    );
    const txn = db.transaction((rows) => {
      const ids = [];
      for (const row of rows) {
        const r = insert.run(row.name, row.phone, row.account_number, row.loan_amount);
        ids.push(r.lastInsertRowid);
      }
      return ids;
    });
    const ids = txn(contacts);
    res.status(201).json({ imported: ids.length, ids });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
