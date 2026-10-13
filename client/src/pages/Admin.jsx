import { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarPlus, CheckCircle2, Clock3, Users } from 'lucide-react';
import { apiMode, checkIn, createSession, getAdminSessions, getSessionBookings, getSessionWaitlist } from '../services/api.js';

export default function Admin() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [checkInSessionId, setCheckInSessionId] = useState('');
  const [expanded, setExpanded] = useState('');
  const [attendees, setAttendees] = useState({});
  const [waitlists, setWaitlists] = useState({});
  const [waitlistExpanded, setWaitlistExpanded] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState({});
  const [form, setForm] = useState({ title: 'Strength Foundations', program: 'strength', coach: '', startAt: '' });

  async function load() {
    setLoading(true); setError('');
    try { const result = await getAdminSessions(); setSessions(result.data || result.sessions || []); }
    catch (e) { setError(e.message || 'Unable to load sessions.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault(); setNotice(''); setError(''); setBusy(true);
    try { await createSession(form); setNotice('Session created.'); setForm({ ...form, startAt: '' }); await load(); }
    catch (e) { setError(e.message || 'Could not create session.'); }
    finally { setBusy(false); }
  }
  async function toggleBookings(id) {
    if (expanded === id) { setExpanded(''); return; }
    setExpanded(id);
    if (!attendees[id]) {
      try { const result = await getSessionBookings(id); setAttendees(prev => ({ ...prev, [id]: result.data || result.bookings || [] })); }
      catch (e) { setError(e.message || 'Could not load session bookings.'); }
    }
  }
  async function toggleWaitlist(id) {
    if (waitlistExpanded === id) {
      setWaitlistExpanded('');
      return;
    }

    setWaitlistExpanded(id);
    setWaitlistLoading((prev) => ({ ...prev, [id]: true }));
    setError('');

    try {
      const result = await getSessionWaitlist(id);
      setWaitlists((prev) => ({ ...prev, [id]: result.data || [] }));
    } catch (e) {
      setError(e.message || 'Could not load the session waitlist.');
      setWaitlists((prev) => ({ ...prev, [id]: null }));
    } finally {
      setWaitlistLoading((prev) => ({ ...prev, [id]: false }));
    }
  }
  async function submitCode(e) {
    e.preventDefault(); setNotice(''); setError(''); setBusy(true);
    try { const result = await checkIn(checkInSessionId, code.trim()); setNotice(`Check-in accepted${result.data?.member ? ` for ${result.data.member}` : ''}.`); setCode(''); }
    catch (e) { setError(e.message || 'Check-in failed.'); }
    finally { setBusy(false); }
  }

  return <div className="app-page">
    <div className="app-page-head"><div><span className="eyebrow">FIT_BRO / STAFF AREA</span><h1>RUN THE<br/><em>FLOOR.</em></h1><p>Manage session times, view bookings, and check members in.</p></div><div className="app-head-index">APP / 03</div></div>
    {apiMode() === 'demo' && <div className="demo-banner"><span>PREVIEW MODE</span> Admin actions are simulated in this browser. Server-side role protection and persistence come in the backend phase.</div>}
    <div className="admin-grid">
      <section className="admin-panel"><div className="panel-heading"><CalendarPlus size={19}/><div><span className="eyebrow">01 / SCHEDULE</span><h2>CREATE A SESSION</h2></div></div>
        <form onSubmit={submit} className="admin-form">
          <label>Session title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required minLength={3}/></label>
          <label>Program<select value={form.program} onChange={e => setForm({ ...form, program: e.target.value })}><option value="strength">Strength</option><option value="conditioning">Conditioning</option><option value="hiit">HIIT</option><option value="personal-training">Personal training</option><option value="mobility">Mobility</option></select></label>
          <label>Coach name<input value={form.coach} onChange={e => setForm({ ...form, coach: e.target.value })} placeholder="Optional"/></label>
          <label>Start date & time<input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} required step="3600"/></label>
          <p className="field-hint">Sessions must start on the hour and run for one hour. Capacity is fixed at 20.</p>
          <button className="button button-primary" disabled={busy || !form.startAt}>{busy ? 'SAVINGâ€¦' : 'CREATE SESSION'} <ArrowUpRight size={16}/></button>
        </form>
      </section>
      <section className="admin-panel"><div className="panel-heading"><CheckCircle2 size={19}/><div><span className="eyebrow">02 / ARRIVALS</span><h2>CHECK IN A MEMBER</h2></div></div>
        <form onSubmit={submitCode} className="admin-form"><label>Session<select value={checkInSessionId} onChange={e => setCheckInSessionId(e.target.value)} required><option value="">Select session</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.title || s.name || 'Training Session'} — {new Date(s.startAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</option>)}</select></label><label>Member check-in code<input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. 7XKP2Q" maxLength={10} required autoCapitalize="characters"/></label><p className="field-hint">Codes must be valid for the session hour and can be used only once.</p><button className="button button-outline" disabled={busy || !checkInSessionId || !code.trim()}>{busy ? 'VERIFYINGâ€¦' : 'VERIFY & CHECK IN'} <ArrowUpRight size={16}/></button></form>
      </section>
    </div>
    {error && <div className="error-panel" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}</div>}
    <section className="admin-sessions"><div className="section-head"><div><span className="eyebrow">03 / SESSION OVERVIEW</span><h2>UPCOMING <span className="muted">SESSIONS.</span></h2></div><span className="admin-count"><Users size={15}/>{sessions.length} sessions</span></div>
      {loading ? <div className="loading-state"><span className="spinner"/>Loading sessionsâ€¦</div> : error && !sessions.length ? <p>Sessions could not be loaded.</p> : <div className="admin-session-list">{sessions.map(s => <article className="admin-session-item" key={s.id}>
        <div className="admin-session-row"><div><span className="eyebrow">{(s.program || 'training').replaceAll('-', ' ').toUpperCase()}</span><h3>{s.title || s.name}</h3><p><Clock3 size={14}/>{new Date(s.startAt).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div><div className="admin-row-actions"><span className="admin-seats">{s.booked ?? s.confirmedBookings ?? 0} / {s.capacity || 20}<small>BOOKED</small></span><button className="button button-outline view-bookings" onClick={() => toggleBookings(s.id)}>{expanded === s.id ? 'HIDE BOOKINGS' : 'VIEW BOOKINGS'}</button><button className="button button-outline view-bookings" onClick={() => toggleWaitlist(s.id)}>{waitlistExpanded === s.id ? 'HIDE WAITLIST' : 'VIEW WAITLIST'}</button></div></div>
        {expanded === s.id && <div className="attendee-panel">{!attendees[s.id] ? <p>Loading bookingsâ€¦</p> : attendees[s.id].length === 0 ? <p>No member bookings for this session yet.</p> : attendees[s.id].map(b => <div className="attendee-row" key={b.id}><span>{b.member?.name || b.name || 'Member'}</span><span>{b.member?.email || b.email || ''}</span><strong>{b.status || 'CONFIRMED'}</strong></div>)}</div>}
        {waitlistExpanded === s.id && <div className="attendee-panel" aria-live="polite"><div className="eyebrow">WAITLIST / FIFO QUEUE</div>{waitlistLoading[s.id] ? <p>Loading waitlist…</p> : waitlists[s.id] === null ? <p>Waitlist could not be loaded. Close and reopen to retry.</p> : !waitlists[s.id] || waitlists[s.id].length === 0 ? <p>No waitlist entries for this session yet.</p> : waitlists[s.id].map((w, index) => <div className="attendee-row" key={w.id}><span>{w.status === 'WAITING' ? `#${w.queuePosition || index + 1} · ` : ''}{w.name || 'Member'}<small>{w.joinedAt ? `Joined ${new Date(w.joinedAt).toLocaleString('en-IN')}` : ''}</small></span><span>{w.email || ''}</span><strong>{w.status || 'WAITING'}</strong></div>)}</div>}
      </article>)}</div>}
    </section>
  </div>;
}
