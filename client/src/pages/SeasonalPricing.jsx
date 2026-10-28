import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { formatDate, getErrorMessage, toISO } from '../utils/format';

const EMPTY = { name: '', startDate: '', endDate: '', percent: 20, roomType: 'all', active: true };

// Admin: seasonal pricing rules. +25 = 25% more expensive, -10 = 10% discount, for every night in the range.
export default function SeasonalPricing() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/seasons');
      setRules(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const edit = (r) => {
    setEditingId(r._id);
    setForm({ name: r.name, startDate: toISO(r.startDate), endDate: toISO(r.endDate), percent: r.percent, roomType: r.roomType, active: r.active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, percent: Number(form.percent) };
      if (editingId) await api.put(`/seasons/${editingId}`, payload);
      else await api.post('/seasons', payload);
      toast.success(editingId ? 'Pricing rule updated.' : 'Pricing rule added.');
      reset();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggle = async (r) => {
    try {
      await api.put(`/seasons/${r._id}`, { active: !r.active });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.name}"?`)) return;
    try {
      await api.delete(`/seasons/${r._id}`);
      toast.success('Pricing rule deleted.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-1">Seasonal pricing</h2>
      <p className="text-muted">Prices change automatically for the nights inside a rule. If rules overlap, the highest increase applies. Guests see the final price when they pick dates.</p>

      <form className="card p-3 shadow-sm mb-4" onSubmit={submit}>
        <h5>{editingId ? 'Edit rule' : 'Add a rule'}</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-3"><label className="form-label" htmlFor="sn">Name</label><input id="sn" className="form-control" placeholder="Festival season" value={form.name} onChange={set('name')} required maxLength={80} /></div>
          <div className="col-6 col-md-2"><label className="form-label" htmlFor="ss">From</label><input id="ss" type="date" className="form-control" value={form.startDate} onChange={set('startDate')} required /></div>
          <div className="col-6 col-md-2"><label className="form-label" htmlFor="se">To (last night)</label><input id="se" type="date" className="form-control" min={form.startDate} value={form.endDate} onChange={set('endDate')} required /></div>
          <div className="col-6 col-md-2"><label className="form-label" htmlFor="sp">Change (%)</label><input id="sp" type="number" min="-80" max="300" className="form-control" value={form.percent} onChange={set('percent')} required /></div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="sr">Room type</label>
            <select id="sr" className="form-select" value={form.roomType} onChange={set('roomType')}>
              <option value="all">All rooms</option><option value="single">Single</option><option value="double">Double</option><option value="deluxe">Deluxe</option><option value="suite">Suite</option>
            </select>
          </div>
        </div>
        <div className="form-check mt-3"><input id="sa" type="checkbox" className="form-check-input" checked={form.active} onChange={set('active')} /><label className="form-check-label" htmlFor="sa">Active</label></div>
        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-brass">{editingId ? 'Save changes' : 'Add rule'}</button>
          {editingId && <button type="button" className="btn btn-outline-secondary" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="table-responsive card shadow-sm">
        <table className="table mb-0">
          <thead><tr><th>Name</th><th>Nights</th><th>Change</th><th>Rooms</th><th>Active</th><th /></tr></thead>
          <tbody>
            {rules.length === 0 && <tr><td colSpan="6" className="text-muted">No pricing rules yet.</td></tr>}
            {rules.map((r) => (
              <tr key={r._id}>
                <td><strong>{r.name}</strong></td>
                <td>{formatDate(r.startDate)} → {formatDate(r.endDate)}</td>
                <td className={r.percent >= 0 ? 'text-danger' : 'text-success'}>{r.percent > 0 ? '+' : ''}{r.percent}%</td>
                <td className="text-capitalize">{r.roomType}</td>
                <td><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={r.active} onChange={() => toggle(r)} aria-label={`Toggle ${r.name}`} /></div></td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => edit(r)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
