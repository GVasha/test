import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatOutcome } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Loading ops snapshot…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Outbound collection queue and recent call outcomes.</p>
        </div>
        <Link className="btn accent" to="/call">
          Open Call Console
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Contacts</div>
          <div className="value">{data.contacts}</div>
        </div>
        <div className="stat-card">
          <div className="label">Queued</div>
          <div className="value">{data.queued}</div>
        </div>
        <div className="stat-card">
          <div className="label">In progress</div>
          <div className="value">{data.inProgress}</div>
        </div>
        <div className="stat-card">
          <div className="label">Completed calls</div>
          <div className="value">{data.completed}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel panel-pad">
          <h2 className="section-title">Recent calls</h2>
          {data.recentCalls.length === 0 ? (
            <div className="empty">No calls yet. Start one from a campaign.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCalls.map((call) => (
                    <tr key={call.id}>
                      <td>
                        <Link to={`/call/${call.id}`}>{call.contact_name}</Link>
                      </td>
                      <td>{call.campaign_name}</td>
                      <td>
                        <span
                          className={`badge ${
                            call.status === 'completed' ? 'success' : 'warn'
                          }`}
                        >
                          {call.status}
                        </span>
                      </td>
                      <td>{formatOutcome(call.outcome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="section-title">Outcomes</h2>
          {data.outcomes.length === 0 ? (
            <div className="empty">Outcomes appear after completed calls.</div>
          ) : (
            <div className="answer-list">
              {data.outcomes.map((row) => (
                <div className="answer-item" key={row.outcome}>
                  <div className="key">{formatOutcome(row.outcome)}</div>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
