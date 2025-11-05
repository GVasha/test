import './loadEnv.js';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import db from './db/index.js';
import contactsRouter from './routes/contacts.js';
import campaignsRouter from './routes/campaigns.js';
import tracksRouter from './routes/tracks.js';
import callsRouter from './routes/calls.js';
import voiceRouter from './routes/voice.js';
import { TRACK_DEFINITIONS } from './seed/tracks.js';
import { SAMPLE_CONTACTS } from './seed/contacts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '4000', 10);

function ensureSeed() {
  const trackCount = db.prepare('SELECT COUNT(*) AS c FROM tracks').get().c;
  if (trackCount === 0) {
    const insertTrack = db.prepare(
      'INSERT INTO tracks (name, description, definition_json) VALUES (?, ?, ?)'
    );
    for (const track of TRACK_DEFINITIONS) {
      insertTrack.run(track.name, track.description, JSON.stringify(track.definition));
    }
  }

  const contactCount = db.prepare('SELECT COUNT(*) AS c FROM contacts').get().c;
  if (contactCount === 0) {
    const insertContact = db.prepare(
      `INSERT INTO contacts (name, phone, account_number, loan_amount, status)
       VALUES (?, ?, ?, ?, 'active')`
    );
    for (const c of SAMPLE_CONTACTS) {
      insertContact.run(c.name, c.phone, c.account_number, c.loan_amount);
    }
  }

  const campaignCount = db.prepare('SELECT COUNT(*) AS c FROM campaigns').get().c;
  if (campaignCount === 0) {
    const standardTrack = db
      .prepare(`SELECT id FROM tracks WHERE name = 'Standard Collection' LIMIT 1`)
      .get();
    if (standardTrack) {
      const result = db
        .prepare(
          `INSERT INTO campaigns (name, track_id, status) VALUES (?, ?, 'active')`
        )
        .run('Demo Collection Wave', standardTrack.id);
      const campaignId = result.lastInsertRowid;
      const contacts = db.prepare('SELECT id FROM contacts ORDER BY id LIMIT 8').all();
      const link = db.prepare(
        `INSERT INTO campaign_contacts (campaign_id, contact_id, call_status)
         VALUES (?, ?, 'queued')`
      );
      for (const contact of contacts) {
        link.run(campaignId, contact.id);
      }
    }
  }
}

ensureSeed();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    node: process.version,
    env: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'development',
  });
});

app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/calls', callsRouter);
app.use('/api/voice', voiceRouter);

const clientDist = path.join(__dirname, '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
const hasClientBuild = fs.existsSync(clientIndex);

if (hasClientBuild) {
  app.use(express.static(clientDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(clientIndex, (err) => {
      if (err) next(err);
    });
  });
} else {
  console.warn(
    `Client build not found at ${clientDist}. Run "npm run build" before production start.`
  );
}

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Collecta listening on port ${PORT} (client: ${hasClientBuild ? 'yes' : 'no'})`);
  });
}

export default app;
