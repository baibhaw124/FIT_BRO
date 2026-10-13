import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Users,
  Check,
  Copy,
  Filter,
  RefreshCw,
} from 'lucide-react';import { apiMode, bookSession, getSessions, joinWaitlist } from '../services/api.js';
const dateLabel = (value) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value));
const timeLabel = (value) => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(value));
export default function Sessions() {
  const location = useLocation(), navigate = useNavigate(); const params = new URLSearchParams(location.search); const initial = params.get('program') || 'all';
  const [successBooking, setSuccessBooking] = useState(null);
  const [filter, setFilter] = useState(initial);
  const [date, setDate] = useState('all'); const [sessions, setSessions] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState(''); const [notice, setNotice] = useState(''); const [waitlisted, setWaitlisted] = useState([]); const [refresh, setRefresh] = useState(0);
  async function load() { setLoading(true); setError(''); try { const result = await getSessions(); setSessions(result.data || result.sessions || []); } catch (e) { setError(e.message || 'Unable to load sessions.'); } finally { setLoading(false); } }
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [refresh]);
  const filtered = useMemo(() => sessions.filter(s => (filter === 'all' || s.program === filter) && (date === 'all' || new Date(s.startAt).toDateString() === new Date(date).toDateString())), [sessions, filter, date]);

  async function book(s) {
    setNotice('');
    setSuccessBooking(null);
    setBusy(s.id);

    try {
      const result = await bookSession(s.id);

      // A full session may return a waitlist entry instead.
      const waitlistEntry = result?.data?.waitlist || result?.waitlist;

      if (waitlistEntry) {
        setWaitlisted((old) =>
          old.includes(s.id) ? old : [...old, s.id]
        );
        setNotice(`You're on the waitlist for ${s.title || 'this session'}.`);
        await load();
        return;
      }

      const booking =
        result?.data?.booking ||
        result?.booking ||
        result?.data;

      if (!booking || !booking.id) {
        throw new Error('Booking response was incomplete. Please refresh and check My Bookings.');
      }

      await load();

      setSuccessBooking({
        sessionTitle: s.title || 'Training Session',
        startAt: s.startAt,
        bookingId: booking.id,
        code: booking.confirmationCode || booking.checkInCode || '',
      });
    } catch (e) {
      await load();
      setNotice(e.message || 'Booking could not be completed.');
    } finally {
      setBusy('');
    }
  }
  async function waitlist(s) { setBusy(s.id); setNotice(''); try { await joinWaitlist(s.id); setWaitlisted(old => [...old, s.id]); setNotice(`You're on the waitlist for ${s.title}.`); } catch (e) { setNotice(e.message || 'Could not join waitlist.') } finally { setBusy('') } }
  const dates = [...new Set(sessions.map(s => new Date(s.startAt).toDateString()))];
  return <div className="app-page"><div className="app-page-head"><div><span className="eyebrow">FIT_BRO / THE SCHEDULE</span><h1>FIND YOUR<br /><em>SESSION.</em></h1><p>Choose the work. Reserve your spot. Show up ready.</p></div><div className="app-head-index">APP / 01</div></div>
    <div className="app-toolbar"><div className="toolbar-label"><Filter size={16} /> FILTER SESSIONS</div><label className="select-wrap"><span className="sr-only">Training program</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All programs</option><option value="strength">Strength</option><option value="conditioning">Conditioning</option><option value="hiit">HIIT</option><option value="personal-training">Personal training</option><option value="mobility">Mobility</option></select></label><label className="select-wrap"><span className="sr-only">Session date</span><select value={date} onChange={e => setDate(e.target.value)}><option value="all">All dates</option>{dates.map(d => <option key={d} value={d}>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d))}</option>)}</select></label><button className="icon-button" onClick={() => setRefresh(x => x + 1)} aria-label="Refresh sessions"><RefreshCw size={17} /></button></div>
    {apiMode() === 'demo' && <div className="demo-banner"><span>PREVIEW MODE</span> These sample sessions are for frontend review. Connect the backend to persist bookings across devices.</div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    {successBooking && (
      <div
        className="booking-modal-backdrop"
        role="presentation"
        onClick={() => setSuccessBooking(null)}
      >
        <section
          className="booking-success-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="booking-modal-close"
            onClick={() => setSuccessBooking(null)}
            aria-label="Close confirmation"
          >
            ×
          </button>

          <div className="booking-success-icon">
            <Check size={34} />
          </div>

          <span className="eyebrow">FIT_BRO / RESERVATION CONFIRMED</span>
          <h2 id="booking-success-title">YOU'RE IN.</h2>
          <p>
            Your spot is reserved. Show up ready and put the work in.
          </p>

          <div className="booking-success-details">
            <strong>{successBooking.sessionTitle}</strong>
            <span>
              {new Date(successBooking.startAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
            <span>Booking ID: #{successBooking.bookingId}</span>

            {successBooking.code && (
              <div className="checkin-code">
                <span>YOUR CHECK-IN CODE</span>
                <strong>{successBooking.code}</strong>
                <button
                  className="button button-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(successBooking.code);
                    setNotice('Confirmation code copied.');
                  }}
                >
                  <Copy size={14} /> Copy code
                </button>
              </div>
            )}
          </div>

          <button
            className="button button-primary"
            onClick={() => {
              setSuccessBooking(null);
              navigate('/my-bookings');
            }}
          >
            VIEW MY BOOKINGS <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
    )}
    {error && <div className="error-panel" role="alert"><strong>Couldn't load sessions</strong><p>{error}</p><button className="button button-outline" onClick={load}>Try again</button></div>}
    {loading ? <div className="loading-state"><span className="spinner" />Loading sessions…</div> : !error && filtered.length === 0 ? <div className="empty-state"><CalendarDays size={28} /><h2>NO SESSIONS FOUND</h2><p>Try another program or date. The work will be here.</p><button className="button button-outline" onClick={() => { setFilter('all'); setDate('all') }}>Clear filters</button></div> : <div className="session-list">{filtered.map((s, i) => { const remaining = s.seatsRemaining ?? Math.max(0, s.capacity - s.booked); const full = remaining <= 0; return <article className="session-row" key={s.id}><div className="session-no">{String(i + 1).padStart(2, '0')}</div><div className="session-main"><span className="eyebrow">{(s.program || 'training').replaceAll('-', ' ').toUpperCase()}</span><h2>{s.title || s.name}</h2><div className="session-meta"><span><CalendarDays size={15} />{dateLabel(s.startAt)}</span><span><Clock3 size={15} />{timeLabel(s.startAt)}</span><span><Users size={15} />{remaining} / {s.capacity} spots</span></div></div><div className="session-status"><span className={full ? 'status-full' : 'status-open'}><i />{full ? 'FULL' : 'SPOTS OPEN'}</span><button className={full ? 'button button-outline' : 'button button-primary'} disabled={busy === s.id || waitlisted.includes(s.id)} onClick={() => full ? waitlist(s) : book(s)}>{busy === s.id ? 'PLEASE WAIT…' : waitlisted.includes(s.id) ? 'WAITLISTED' : full ? 'JOIN WAITLIST' : 'BOOK SPOT'}{busy !== s.id && <ArrowUpRight size={16} />}</button></div></article> })}</div>}
    <div className="app-footnote"><span>CAPACITY IS LIMITED TO 20 PER SESSION.</span><span>SEATS REFRESH EVERY 30 SECONDS <RefreshCw size={12} /></span></div>
  </div>;
}
