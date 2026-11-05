import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Tracks() {
  const [tracks, setTracks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = tracks.find((t) => t.id === selectedId) || null;

  async function load() {
    const rows = await api.getTracks();
    setTracks(rows);
    if (!selectedId && rows[0]) {
      selectTrack(rows[0]);
    } else if (selectedId) {
      const current = rows.find((t) => t.id === selectedId);
      if (current) selectTrack(current);
    }
  }

  function selectTrack(track) {
    setSelectedId(track.id);
    setName(track.name);
    setDescription(track.description);
    setJsonText(JSON.stringify(track.definition, null, 2));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function save() {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const definition = JSON.parse(jsonText);
      await api.updateTrack(selectedId, { name, description, definition });
      setMessage('Track saved');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const nodes = selected?.definition?.nodes
    ? Object.values(selected.definition.nodes)
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tracks</h1>
          <p>Branching conversation scripts used by the simulated caller.</p>
        </div>
        {selected && (
          <button className="btn" disabled={busy} onClick={save}>
            Save track
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="muted">{message}</p>}

      <div className="grid-2">
        <div className="stack">
          <div className="panel panel-pad">
            <h2 className="section-title">Available tracks</h2>
            <div className="answer-list">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  className="answer-item"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    border:
                      t.id === selectedId
                        ? '1px solid var(--accent)'
                        : '1px solid transparent',
                    background: t.id === selectedId ? 'var(--accent-soft)' : undefined,
                  }}
                  onClick={() => selectTrack(t)}
                >
                  <strong>{t.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="panel panel-pad">
              <h2 className="section-title">Node overview</h2>
              <div className="track-nodes">
                {nodes.map((node) => (
                  <div className="track-node" key={node.id}>
                    <strong>
                      {node.id}
                      {selected.definition.root === node.id ? ' (root)' : ''}
                    </strong>
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      {node.prompt}
                    </div>
                    {node.choices?.length > 0 && (
                      <div className="muted" style={{ marginTop: 6, fontSize: '0.8rem' }}>
                        → {node.choices.map((c) => c.label).join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="section-title">Edit definition</h2>
          {!selected ? (
            <div className="empty">Select a track</div>
          ) : (
            <div className="form-grid">
              <label className="field">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                Description
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="field">
                Definition JSON
                <textarea
                  style={{ minHeight: 420, fontFamily: 'ui-monospace, monospace' }}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
