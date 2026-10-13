const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// Browser-only simulation is development-only; production must use the API.
const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false';
const now = new Date();
const dateAt = (offset, hour) => { const d = new Date(now); d.setDate(d.getDate()+offset); d.setHours(hour,0,0,0); return d.toISOString(); };
let demoSessions = [
  { id:'demo-s1', title:'Strength Foundations', program:'strength', coach:'Coach A', startAt:dateAt(0,17), capacity:20, booked:14 },
  { id:'demo-s2', title:'Engine Room', program:'conditioning', coach:'Coach B', startAt:dateAt(0,18), capacity:20, booked:20 },
  { id:'demo-s3', title:'HIIT — 40/20', program:'hiit', coach:'Coach C', startAt:dateAt(0,19), capacity:20, booked:11 },
  { id:'demo-s4', title:'Strength Foundations', program:'strength', coach:'Coach A', startAt:dateAt(1,7), capacity:20, booked:8 },
  { id:'demo-s5', title:'Mobility Reset', program:'mobility', coach:'Coach D', startAt:dateAt(1,18), capacity:20, booked:5 },
  { id:'demo-s6', title:'Personal Coaching', program:'personal-training', coach:'Coach E', startAt:dateAt(2,17), capacity:20, booked:19 },
];
const readStored = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const saveStored = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be unavailable in private browsing */ } };
demoSessions = readStored('fitbro_demo_sessions', demoSessions);
let demoBookings = readStored('fitbro_demo_bookings', []);
let demoWaitlist = readStored('fitbro_demo_waitlist', []);
const readToken = () => localStorage.getItem('fitbro_token');
const makeDemoCheckInCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(readToken()
        ? { Authorization: `Bearer ${readToken()}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      body.error?.message ||
      (typeof body.error === 'string' ? body.error : null) ||
      body.message ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return body;
}

export const apiMode = () => DEMO_MODE ? 'demo' : 'api';

export async function register(payload) {
  if (DEMO_MODE) {
    const user = {
      id: `demo-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: 'MEMBER',
    };
    return { user, token: 'demo-token' };
  }

  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Registration creates the account; login obtains its JWT.
  return login({
    email: payload.email,
    password: payload.password,
  });
}

export async function login(payload) {
  if (DEMO_MODE) {
    const email = payload.email.trim().toLowerCase();
    const user = {
      id: `demo-${email}`,
      name: email.split('@')[0] || 'Member',
      email,
      role: email === 'admin@fitbro.local' ? 'ADMIN' : 'MEMBER',
    };
    return { user, token: 'demo-token' };
  }

  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.data;
}

export async function bookSession(id) {
  if (DEMO_MODE) {
    const s = demoSessions.find(x => x.id === id);
    const user = getCurrentUser();

    if (!user) throw new Error('Sign in before booking a session.');
    if (!s) throw new Error('Session not found.');

    if (demoBookings.some(
      b => b.sessionId === id &&
        b.userId === user.id &&
        b.status === 'CONFIRMED'
    )) {
      throw new Error('You already have a booking for this session.');
    }

    if (s.booked >= s.capacity) {
      throw new Error('This session is full. Join the waitlist instead.');
    }

    s.booked++;

    const b = {
      id: `demo-b${Date.now()}`,
      userId: user.id,
      sessionId: id,
      status: 'CONFIRMED',
      checkInCode: makeDemoCheckInCode(),
      createdAt: new Date().toISOString(),
    };

    demoBookings.push(b);
    saveStored('fitbro_demo_bookings', demoBookings);
    saveStored('fitbro_demo_sessions', demoSessions);

    return { data: b };
  }

  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify({ sessionId: id }),
  });
}


export async function joinWaitlist(id) {
  if (DEMO_MODE) {
    const user = getCurrentUser();

    if (!user) {
      throw new Error('Sign in before joining the waitlist.');
    }

    if (demoWaitlist.some(
      w => w.sessionId === id && w.userId === user.id
    )) {
      throw new Error('You are already on this waitlist.');
    }

    const w = {
      id: `demo-w${Date.now()}`,
      userId: user.id,
      sessionId: id,
      position: demoWaitlist.filter(x => x.sessionId === id).length + 1,
    };

    demoWaitlist.push(w);
    saveStored('fitbro_demo_waitlist', demoWaitlist);

    return { data: w };
  }

  return bookSession(id);
}
export async function getSessions() {
  if (DEMO_MODE) {
    return {
      data: demoSessions.map((s) => ({
        ...s,
        booked: Number(s.booked) || 0,
        capacity: Number(s.capacity) || 20,
        seatsRemaining: Math.max(
          0,
          (Number(s.capacity) || 20) - (Number(s.booked) || 0)
        ),
      })),
    };
  }

  const result = await request('/sessions');

  const rawSessions = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.sessions)
      ? result.data.sessions
      : Array.isArray(result.sessions)
        ? result.sessions
        : [];

  const sessions = rawSessions.map((s) => {
    const capacity = Number(s.capacity) || 20;
    const remaining = Number(
      s.remainingSeats ?? s.seatsRemaining
    );

    const seatsRemaining = Number.isFinite(remaining)
      ? Math.max(0, Math.min(capacity, remaining))
      : capacity;

    return {
      ...s,
      title: s.title || 'Training Session',
      program: s.program || 'training',
      capacity,
      seatsRemaining,
      booked: capacity - seatsRemaining,
    };
  });

  return { ...result, data: sessions };
}


export async function getMyBookings() {
  if (DEMO_MODE) {
    const user = getCurrentUser();

    return {
      data: demoBookings
        .filter((b) => b.userId === user?.id)
        .map((b) => ({
          ...b,
          session: demoSessions.find(
            (s) => s.id === b.sessionId
          ),
        })),
    };
  }

  const result = await request('/bookings/me');

  const bookings = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.bookings)
      ? result.data.bookings
      : Array.isArray(result.bookings)
        ? result.bookings
        : [];

  return { ...result, data: bookings };
}

export async function cancelBooking(id) {
  if (DEMO_MODE) { const user=getCurrentUser(); const b=demoBookings.find(x=>x.id===id && x.userId===user?.id); if(!b) throw new Error('Booking not found.'); if(b.status!=='CONFIRMED') throw new Error('This booking cannot be cancelled.'); b.status='CANCELLED'; const s=demoSessions.find(x=>x.id===b.sessionId); if(s) s.booked=Math.max(0,s.booked-1); saveStored('fitbro_demo_bookings', demoBookings); saveStored('fitbro_demo_sessions', demoSessions); return { data:b }; }
  return request(`/bookings/${id}`,{method:'DELETE'});
}

export async function getAdminSessions() {
  return getSessions();
}


export async function createSession(payload) {
  if (DEMO_MODE) {
    const startAt = new Date(payload.startAt);

    if (!Number.isFinite(startAt.getTime())) {
      throw new Error('Please select a valid session date and time.');
    }

    if (startAt <= new Date()) {
      throw new Error('Session must start in the future.');
    }

    if (startAt.getMinutes() !== 0) {
      throw new Error('Sessions must start on the hour.');
    }

    if (
      demoSessions.some(
        (s) =>
          new Date(s.startAt).getTime() === startAt.getTime()
      )
    ) {
      throw new Error('A session already exists at this start time.');
    }

    const session = {
      id: `demo-s${Date.now()}`,
      title: payload.title || 'Training Session',
      program: payload.program || 'training',
      coach: payload.coach || 'Coach TBC',
      startAt: startAt.toISOString(),
      capacity: 20,
      booked: 0,
      seatsRemaining: 20,
    };

    demoSessions.push(session);
    saveStored('fitbro_demo_sessions', demoSessions);

    return { data: session };
  }

  const date = new Date(payload.startAt);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Please select a valid session date and time.');
  }

  if (date <= new Date()) {
    throw new Error('Session must start in the future.');
  }

  if (date.getMinutes() !== 0) {
    throw new Error('Sessions must start on the hour.');
  }

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';

  const offsetHours = String(
    Math.floor(Math.abs(offsetMinutes) / 60)
  ).padStart(2, '0');

  const offsetMins = String(
    Math.abs(offsetMinutes) % 60
  ).padStart(2, '0');

  const localStartAt =
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` +
    `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00` +
    `${sign}${offsetHours}:${offsetMins}`;

  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      startAt: localStartAt,
    }),
  });
}

export async function checkIn(sessionId, code) {
  if (DEMO_MODE) {
    const b = demoBookings.find(
      x => x.checkInCode === code.toUpperCase() &&
        x.status === 'CONFIRMED'
    );

    if (!b) {
      throw new Error('Code not found or booking is not active.');
    }

    b.status = 'CHECKED_IN';
    saveStored('fitbro_demo_bookings', demoBookings);

    return { data: { booking: b, member: 'Demo Member' } };
  }

  return request('/bookings/check-in', {
    method: 'POST',
    body: JSON.stringify({ sessionId, code }),
  });
}

export async function getSessionBookings(sessionId) {
  if (DEMO_MODE) {
    return {
      data: demoBookings
        .filter((b) => b.sessionId === sessionId)
        .map((b, i) => ({
          ...b,
          member: {
            name: `Demo Member ${i + 1}`,
            email: `member${i + 1}@example.test`,
          },
        })),
    };
  }

  const result = await request(`/sessions/${sessionId}/bookings`);

  const bookings = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.bookings)
      ? result.data.bookings
      : Array.isArray(result.bookings)
        ? result.bookings
        : [];

  return { ...result, data: bookings };
}

export function getCurrentUser() { try { return JSON.parse(localStorage.getItem('fitbro_user')||'null'); } catch { return null; } }
