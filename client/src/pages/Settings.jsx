import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { resetScenes } from '../hooks/useScenes';
import { getErrorMessage, optimizeImg } from '../utils/format';

// Admin: platform configuration. Hotel details appear in the footer and on invoices;
// hero photos become the animated background of the home page.
export default function Settings() {
  const [form, setForm] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => setForm({ ...r.data, heroImages: r.data.heroImages || [] })).catch((e) => toast.error(getErrorMessage(e)));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onFiles = async (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const { data } = await api.post('/rooms/upload', fd);
      setForm((prev) => ({ ...prev, heroImages: [...prev.heroImages, ...data.urls].slice(0, 8) }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Image link must start with http:// or https://');
      return;
    }
    setForm({ ...form, heroImages: [...form.heroImages, url].slice(0, 8) });
    setUrlInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/settings', { ...form, taxPercent: Number(form.taxPercent) });
      setForm({ ...data, heroImages: data.heroImages || [] });
      resetScenes();
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!form) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h2 className="mb-3">Platform settings</h2>
      <form className="card p-4" onSubmit={submit}>
        <h5>Home page photos</h5>
        <p className="text-muted small">Upload 3 to 8 good photos of the hotel (lobby, rooms, pool, restaurant). They crossfade behind the home page as guests scroll.</p>
        <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} disabled={uploading} aria-label="Upload home page photos" />
        {uploading && <div className="small text-muted mt-1">Uploading…</div>}
        <div className="input-group mt-2 mb-2">
          <input className="form-control" placeholder="Or paste an image link (https://...)" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} aria-label="Image link" />
          <button type="button" className="btn btn-outline-secondary" onClick={addUrl}>Add link</button>
        </div>
        {form.heroImages.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {form.heroImages.map((src, i) => (
              <div key={src + i} className="position-relative">
                <img src={optimizeImg(src, 300)} alt={`Home photo ${i + 1}`} width="120" height="80" className="rounded border" style={{ objectFit: 'cover' }} />
                <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 py-0 px-1" aria-label={`Remove photo ${i + 1}`} onClick={() => setForm({ ...form, heroImages: form.heroImages.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
          </div>
        )}

        <hr />
        <h5>Hotel details</h5>
        <label className="form-label" htmlFor="hn">Hotel name</label>
        <input id="hn" className="form-control mb-3" value={form.hotelName} onChange={set('hotelName')} required maxLength={80} />
        <label className="form-label" htmlFor="ha">Address</label>
        <input id="ha" className="form-control mb-3" value={form.address} onChange={set('address')} maxLength={200} />
        <div className="row">
          <div className="col-md-6"><label className="form-label" htmlFor="hp">Phone</label><input id="hp" className="form-control mb-3" value={form.phone} onChange={set('phone')} maxLength={30} /></div>
          <div className="col-md-6"><label className="form-label" htmlFor="he">Email</label><input id="he" type="email" className="form-control mb-3" value={form.email} onChange={set('email')} maxLength={80} /></div>
        </div>
        <div className="row">
          <div className="col-md-4"><label className="form-label" htmlFor="ht">GST included in prices (%)</label><input id="ht" type="number" min="0" max="50" className="form-control mb-3" value={form.taxPercent} onChange={set('taxPercent')} /></div>
          <div className="col-md-4"><label className="form-label" htmlFor="hi">Check-in time</label><input id="hi" type="time" className="form-control mb-3" value={form.checkInTime} onChange={set('checkInTime')} /></div>
          <div className="col-md-4"><label className="form-label" htmlFor="ho">Check-out time</label><input id="ho" type="time" className="form-control mb-3" value={form.checkOutTime} onChange={set('checkOutTime')} /></div>
        </div>
        <button className="btn btn-brass" disabled={uploading}>Save settings</button>
      </form>
    </div>
  );
}
