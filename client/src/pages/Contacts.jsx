import { useEffect, useState } from 'react';
import { api, formatMoney } from '../api.js';

const emptyForm = { name: '', phone: '', account_number: '', loan_amount: '' };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const rows = await api.getContacts();
    setContacts(rows);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.createContact({
        ...form,
        loan_amount: Number(form.loan_amount) || 0,
      });
      setForm(emptyForm);
      setMessage('Contact added');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api.uploadContacts(file);
      setMessage(`Imported ${result.imported} contacts from CSV`);
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
          <h1>Contacts</h1>
          <p>Upload borrower lists or add people individually.</p>
        </div>
        <label className="btn secondary">
          Upload CSV
          <input type="file" accept=".csv,text/csv" hidden onChange={onUpload} />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="muted">{message}</p>}

      <div className="grid-2">
        <div className="panel panel-pad">
          <h2 className="section-title">Borrower list</h2>
          {contacts.length === 0 ? (
            <div className="empty">No contacts yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Account</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{c.account_number || '—'}</td>
                      <td>{formatMoney(c.loan_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 className="section-title">Add contact</h2>
          <form className="form-grid" onSubmit={onCreate}>
            <label className="field">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field">
              Phone
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label className="field">
                Account number
                <input
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                />
              </label>
              <label className="field">
                Loan amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.loan_amount}
                  onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                />
              </label>
            </div>
            <button className="btn" disabled={busy} type="submit">
              Save contact
            </button>
          </form>
          <p className="muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            CSV headers: name, phone, account_number, loan_amount
          </p>
        </div>
      </div>
    </div>
  );
}
