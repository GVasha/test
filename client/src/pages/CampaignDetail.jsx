import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatMoney } from '../api.js';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getCampaign(id);
    setCampaign(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function activate() {
    setBusy(true);
    try {
      await api.startCampaign(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function startNext() {
    setBusy(true);
    setError('');
    try {
      const call = await api.startCall({ campaignId: Number(id) });
      navigate(`/call/${call.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function startForContact(contactId) {
    setBusy(true);
    setError('');
    try {
      const call = await api.startCall({
        campaignId: Number(id),
        contactId,
      });
      navigate(`/call/${call.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!campaign && !error) {
    return (
      <div className="page-header">
        <div>
          <h1>Campaign</h1>
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return <p className="error">{error}</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{campaign.name}</h1>
          <p>
            Track: {campaign.track_name} ·{' '}
            <span className="badge">{campaign.status}</span>
          </p>
        </div>
        <div className="row">
          {campaign.status === 'draft' && (
            <button className="btn secondary" disabled={busy} onClick={activate}>
              Activate
            </button>
          )}
          <button className="btn accent" disabled={busy} onClick={startNext}>
            Call next queued
          </button>
          <Link className="btn secondary" to="/campaigns">
            Back
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total</div>
          <div className="value">{campaign.stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="label">Queued</div>
          <div className="value">{campaign.stats.queued}</div>
        </div>
        <div className="stat-card">
          <div className="label">In progress</div>
          <div className="value">{campaign.stats.in_progress}</div>
        </div>
        <div className="stat-card">
          <div className="label">Completed</div>
          <div className="value">{campaign.stats.completed}</div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h2 className="section-title">Queue</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Account</th>
                <th>Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaign.contacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.account_number}</td>
                  <td>{formatMoney(c.loan_amount)}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.call_status === 'completed'
                          ? 'success'
                          : c.call_status === 'in_progress'
                            ? 'warn'
                            : ''
                      }`}
                    >
                      {c.call_status}
                    </span>
                  </td>
                  <td>
                    {c.call_status === 'queued' && (
                      <button
                        className="btn small"
                        disabled={busy}
                        onClick={() => startForContact(c.id)}
                      >
                        Call
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
