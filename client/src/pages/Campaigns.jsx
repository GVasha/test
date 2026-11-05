import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');
  const [trackId, setTrackId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, t, people] = await Promise.all([
      api.getCampaigns(),
      api.getTracks(),
      api.getContacts(),
    ]);
    setCampaigns(c);
    setTracks(t);
    setContacts(people);
    if (!trackId && t[0]) setTrackId(String(t[0].id));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function toggleContact(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createCampaign({
        name,
        track_id: Number(trackId),
        contact_ids: selected,
      });
      setName('');
      setSelected([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Campaigns</h1>
          <p>Assign a conversation track to a set of borrowers.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <div className="panel panel-pad">
          <h2 className="section-title">All campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="empty">No campaigns yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Track</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.track_name}</td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === 'completed'
                              ? 'success'
                              : c.status === 'active'
                                ? 'warn'
                                : ''
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.completed_count}/{c.contact_count}
                      </td>
                      <td>
                        <Link className="btn small secondary" to={`/campaigns/${c.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="section-title">New campaign</h2>
          <form className="form-grid" onSubmit={onCreate}>
            <label className="field">
              Campaign name
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              Track
              <select required value={trackId} onChange={(e) => setTrackId(e.target.value)}>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className="section-title">Select contacts</div>
              <div className="contact-picker">
                {contacts.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                    />
                    <span>
                      {c.name} · {c.phone}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn" disabled={busy || selected.length === 0} type="submit">
              Create campaign
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
