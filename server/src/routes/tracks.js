import { Router } from 'express';
import db from '../db/index.js';
import { parseTrackDefinition } from '../services/trackEngine.js';

const router = Router();

router.get('/', (_req, res) => {
  const tracks = db
    .prepare(
      `SELECT id, name, description, definition_json, created_at FROM tracks ORDER BY id ASC`
    )
    .all()
    .map((t) => ({
      ...t,
      definition: JSON.parse(t.definition_json),
      definition_json: undefined,
    }));
  res.json(tracks);
});

router.get('/:id', (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(Number(req.params.id));
  if (!track) return res.status(404).json({ error: 'Track not found' });
  res.json({
    id: track.id,
    name: track.name,
    description: track.description,
    definition: JSON.parse(track.definition_json),
    created_at: track.created_at,
  });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Track not found' });

  const { name, description, definition } = req.body || {};
  let definitionJson = existing.definition_json;

  if (definition !== undefined) {
    try {
      parseTrackDefinition(definition);
      definitionJson = JSON.stringify(definition);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  db.prepare(
    `UPDATE tracks SET name = ?, description = ?, definition_json = ? WHERE id = ?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    definitionJson,
    id
  );

  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  res.json({
    id: track.id,
    name: track.name,
    description: track.description,
    definition: JSON.parse(track.definition_json),
    created_at: track.created_at,
  });
});

export default router;
