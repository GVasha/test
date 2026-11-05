import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatOutcome } from '../api.js';

export default function Results() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getCampaigns()
      .then(setCampaigns)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    api
      .getResults(campaignId || undefined)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [campaignId]);

  async function openCall(id) {
    setError('');
    try {
      const call = await api.getCall(id);
      setSelected(call);
    } catch (err) {
      setError(err.message);
    }
  }

  function exportCsv() {
    const header = [
      'id',
      'campaign',
      'contact',
      'phone',
      'account',
      'loan_amount',
      'track',
      'status',
      'outcome',
      'started_at',
      'ended_at',
      'answer_count',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          csv(r.campaign_name),
          csv(r.contact_name),
          csv(r.phone),
          csv(r.account_number),
          r.loan_amount,
          csv(r.track_name),
          r.status,
          r.outcome || '',
          r.started_at,
          r.ended_at || '',
          r.answer_count,
        ].join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'call-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Results</h1>
          <p>Completed conversations, gathered fields, and outcomes.</p>
        </div>
        <div className="row">
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn secondary" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <div className="panel panel-pad">
          <h2 className="section-title">Calls</h2>
          {rows.length === 0 ? (
            <div className="empty">No call results yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Campaign</th>
                    <th>Outcome</th>
                    <th>Fields</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div>{r.contact_name}</div>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>
                          {formatMoney(r.loan_amount)}
                        </div>
                      </td>
                      <td>{r.campaign_name}</td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === 'completed' ? 'success' : 'warn'
                          }`}
                        >
                          {formatOutcome(r.outcome) || r.status}
                        </span>
                      </td>
                      <td>{r.answer_count}</td>
                      <td>
                        <button className="btn small secondary" onClick={() => openCall(r.id)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="section-title">Call detail</h2>
          {!selected ? (
            <div className="empty">Select a call to inspect transcript and answers.</div>
          ) : (
            <div className="stack">
              <div className="kv">
                <div className="kv-row">
                  <span>Contact</span>
                  <strong>{selected.contact.name}</strong>
                </div>
                <div className="kv-row">
                  <span>Outcome</span>
                  <strong>{formatOutcome(selected.outcome)}</strong>
                </div>
                <div className="kv-row">
                  <span>Track</span>
                  <strong>{selected.track_name}</strong>
                </div>
              </div>

              <div>
                <div className="section-title">Answers</div>
                {selected.answers.length === 0 ? (
                  <p className="muted">No fields saved.</p>
                ) : (
                  <div className="answer-list">
                    {selected.answers.map((a) => (
                      <div className="answer-item" key={a.id}>
                        <div className="key">{a.field_key}</div>
                        <div>{a.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="section-title">Transcript</div>
                <div className="transcript-body" style={{ maxHeight: 320, borderRadius: 10 }}>
                  {selected.messages.map((m) => (
                    <div key={m.id} className={`bubble ${m.role}`}>
                      <div className="who">{m.role}</div>
                      <div>{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Link className="btn secondary" to={`/call/${selected.id}`}>
                Open in console
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function csv(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}
