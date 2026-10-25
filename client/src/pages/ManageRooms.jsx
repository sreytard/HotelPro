import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useLiveRefresh from '../hooks/useLiveRefresh';
import StatusBadge from '../components/StatusBadge';
import { formatINR, getErrorMessage, roomImage } from '../utils/format';

const EMPTY = { roomNumber: '', type: 'double', pricePerNight: '', capacity: 2, description: '', amenities: '', status: 'available' };

// Room inventory CRUD with real photo upload (staff can add/edit, only admin can delete)
export default function ManageRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]); // list of photo URLs for the room being edited/added
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/rooms', { params: { all: true } });
      setRooms(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const reset = () => { setForm(EMPTY); setImages([]); setUrlInput(''); setEditingId(null); };

  const edit = (room) => {
    setEditingId(room._id);
    setForm({
      roomNumber: room.roomNumber, type: room.type, pricePerNight: room.pricePerNight, capacity: room.capacity,
      description: room.description || '', amenities: (room.amenities || []).join(', '), status: room.status,
    });
    setImages(room.images || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Upload photos chosen from the computer
  const onFiles = async (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const { data } = await api.post('/rooms/upload', fd);
      setImages((prev) => [...prev, ...data.urls]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError('Image link must start with http:// or https://');
      return;
    }
    setError('');
    setImages((prev) => [...prev, url]);
    setUrlInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setBusy(true);
    const payload = {
      ...form,
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity),
      amenities: toList(form.amenities),
      images,
    };
    try {
      if (editingId) await api.put(`/rooms/${editingId}`, payload);
      else await api.post('/rooms', payload);
      setMessage(editingId ? 'Room updated.' : 'Room added.');
      reset();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (room) => {
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    setError(''); setMessage('');
    try {
      await api.delete(`/rooms/${room._id}`);
      setMessage('Room deleted.');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Manage rooms</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card p-3 shadow-sm mb-4" onSubmit={submit}>
        <h5>{editingId ? 'Edit room' : 'Add a room'}</h5>
        <div className="row g-3">
          <div className="col-6 col-md-2"><label className="form-label" htmlFor="mrn">Room no.</label><input id="mrn" className="form-control" value={form.roomNumber} onChange={set('roomNumber')} required /></div>
          <div className="col-6 col-md-2">
            <label className="form-label" htmlFor="mty">Type</label>
            <select id="mty" className="form-select" value={form.type} onChange={set('type')}>
              <option value="single">Single</option><option value="double">Double</option><option value="deluxe">Deluxe</option><option value="suite">Suite</option>
            </select>
          </div>
          <div className="col-6 col-md-3"><label className="form-label" htmlFor="mpr">Price per night (₹)</label><input id="mpr" type="number" min="1" className="form-control" value={form.pricePerNight} onChange={set('pricePerNight')} required /></div>
          <div className="col-6 col-md-2"><label className="form-label" htmlFor="mca">Capacity</label><input id="mca" type="number" min="1" max="10" className="form-control" value={form.capacity} onChange={set('capacity')} required /></div>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="mst">Status</label>
            <select id="mst" className="form-select" value={form.status} onChange={set('status')}>
              <option value="available">Available</option><option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="col-12"><label className="form-label" htmlFor="mde">Description</label><textarea id="mde" rows="2" className="form-control" value={form.description} onChange={set('description')} /></div>
          <div className="col-12"><label className="form-label" htmlFor="mam">Amenities (comma separated)</label><input id="mam" className="form-control" placeholder="Wi-Fi, AC, TV" value={form.amenities} onChange={set('amenities')} /></div>

          <div className="col-12">
            <label className="form-label" htmlFor="mph">Room photos (JPG, PNG or WebP, up to 5 MB each)</label>
            <input id="mph" type="file" className="form-control" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} disabled={uploading} />
            {uploading && <div className="small text-muted mt-1">Uploading…</div>}
            <div className="input-group mt-2">
              <input className="form-control" placeholder="Or paste an image link (https://...)" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} aria-label="Image link" />
              <button type="button" className="btn btn-outline-secondary" onClick={addUrl}>Add link</button>
            </div>
            {images.length > 0 && (
              <>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {images.map((src, i) => (
                    <div key={src + i} className="position-relative">
                      <img src={src} alt={`Room photo ${i + 1}`} width="110" height="80" className="rounded border" style={{ objectFit: 'cover' }} />
                      <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 py-0 px-1" aria-label={`Remove photo ${i + 1}`} onClick={() => setImages(images.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
                <div className="small text-muted mt-1">The first photo is the cover photo.</div>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-brass" disabled={busy || uploading}>{editingId ? 'Save changes' : 'Add room'}</button>
          {editingId && <button type="button" className="btn btn-outline-secondary" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="table-responsive card shadow-sm">
        <table className="table mb-0">
          <thead><tr><th /><th>Room</th><th>Type</th><th>Price</th><th>Capacity</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r._id}>
                <td><img src={roomImage(r)} alt="" width="64" height="44" className="rounded" style={{ objectFit: 'cover' }} /></td>
                <td><strong>{r.roomNumber}</strong></td>
                <td className="text-capitalize">{r.type}</td>
                <td>{formatINR(r.pricePerNight)}</td>
                <td>{r.capacity}</td>
                <td><StatusBadge value={r.status} /></td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => edit(r)}>Edit</button>
                  {user.role === 'admin' && <button className="btn btn-sm btn-outline-danger" onClick={() => remove(r)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
