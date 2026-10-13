import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  TicketCheck,
  XCircle,
  Copy,
  CheckCircle2,
} from 'lucide-react';import { apiMode, cancelBooking, getMyBookings } from '../services/api.js';
const dateLabel = v => v?new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'Session date';
export default function MyBookings(){const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState('');async function load(){setLoading(true);setError('');try{const r=await getMyBookings();setItems(r.data||r.bookings||[])}catch(e){setError(e.message)}finally{setLoading(false)}}useEffect(()=>{load()},[]);async function cancel(b){setBusy(b.id);setNotice('');try{await cancelBooking(b.id);setNotice('Booking cancelled.');await load()}catch(e){setNotice(e.message)}finally{setBusy('')}}return <div className="app-page"><div className="app-page-head"><div><span className="eyebrow">FIT_BRO / YOUR ACCOUNT</span><h1>YOUR<br/><em>BOOKINGS.</em></h1><p>Keep your commitments close. Every session counts.</p></div><div className="app-head-index">APP / 02</div></div>{apiMode()==='demo'&&<div className="demo-banner"><span>PREVIEW MODE</span> Demo bookings live only in this browser session and are not saved to a server.</div>}{notice&&<div className="notice" role="status">{notice}</div>}{loading?<div className="loading-state"><span className="spinner"/>Loading your bookings…</div>:error?<div className="error-panel"><h2>Bookings unavailable</h2><p>{error}</p><button className="button button-outline" onClick={load}>Try again</button></div>:items.length===0?<div className="empty-state"><TicketCheck size={30}/><h2>NOTHING BOOKED. YET.</h2><p>Your next training session is one good decision away.</p><Link to="/sessions" className="button button-primary">FIND A SESSION <ArrowUpRight size={16}/></Link></div>:<div className="booking-list">{items.map((b,i)=><article className="booking-row" key={b.id}><div className="session-no">{String(i+1).padStart(2,'0')}</div><div className="booking-info"><span className="eyebrow">{b.status||'CONFIRMED'}</span><h2>{b.session?.title||b.title||'Training session'}</h2><p>
{(() => {
  const startsAt = b.session?.startAt || b.startAt;
  const code = b.confirmationCode || b.checkInCode;

  return (
    <>
      <p>
        <CalendarDays size={15} />
        {dateLabel(startsAt)}
        <Clock3 size={15} />
        {startsAt
          ? new Date(startsAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : 'Time unavailable'}
      </p>

      <div className="booking-reference">
        <span>BOOKING ID</span>
        <strong>#{b.id}</strong>
      </div>

      {code && (
        <div className="checkin-code">
          <span>YOUR CHECK-IN CODE</span>
          <strong>{code}</strong>
          <button
            type="button"
            className="button button-outline"
            onClick={() => {
              navigator.clipboard.writeText(String(code));
              setNotice('Confirmation code copied.');
            }}
            aria-label="Copy confirmation code"
          >
            <Copy size={14} /> Copy code
          </button>
        </div>
      )}
    </>
  );
})()}
</p>{b.checkInCode&&<div className="checkin-code"><span>YOUR CHECK-IN CODE</span><strong>{b.checkInCode}</strong></div>}</div>{b.status==='CONFIRMED'&&<button className="button button-outline cancel-button" disabled={busy===b.id} onClick={()=>cancel(b)}>{busy===b.id?'CANCELLING':'CANCEL BOOKING'} <XCircle size={16}/></button>}</article>)}</div>}<div className="app-bottom-link"><Link to="/sessions" className="text-link">Browse more sessions <ArrowUpRight size={16}/></Link></div></div>}
