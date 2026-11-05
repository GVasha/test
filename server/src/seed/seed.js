import db from '../db/index.js';
import { TRACK_DEFINITIONS } from './tracks.js';
import { SAMPLE_CONTACTS } from './contacts.js';

function seed() {
  const trackCount = db.prepare('SELECT COUNT(*) AS c FROM tracks').get().c;
  const contactCount = db.prepare('SELECT COUNT(*) AS c FROM contacts').get().c;
  const campaignCount = db.prepare('SELECT COUNT(*) AS c FROM campaigns').get().c;

  if (trackCount === 0) {
    const insertTrack = db.prepare(
      'INSERT INTO tracks (name, description, definition_json) VALUES (?, ?, ?)'
    );
    for (const track of TRACK_DEFINITIONS) {
      insertTrack.run(track.name, track.description, JSON.stringify(track.definition));
    }
    console.log(`Seeded ${TRACK_DEFINITIONS.length} tracks`);
  } else {
    console.log(`Tracks already present (${trackCount}), skipping`);
  }

  if (contactCount === 0) {
    const insertContact = db.prepare(
      `INSERT INTO contacts (name, phone, account_number, loan_amount, status)
       VALUES (?, ?, ?, ?, 'active')`
    );
    for (const c of SAMPLE_CONTACTS) {
      insertContact.run(c.name, c.phone, c.account_number, c.loan_amount);
    }
    console.log(`Seeded ${SAMPLE_CONTACTS.length} contacts`);
  } else {
    console.log(`Contacts already present (${contactCount}), skipping`);
  }

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
      console.log(`Seeded demo campaign #${campaignId} with ${contacts.length} contacts`);
    }
  } else {
    console.log(`Campaigns already present (${campaignCount}), skipping`);
  }

  console.log('Seed complete');
}

seed();
