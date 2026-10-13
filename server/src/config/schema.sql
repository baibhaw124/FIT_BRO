
-- server/src/config/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'MEMBER'
        CHECK (role IN ('MEMBER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    start_at TIMESTAMPTZ NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity = 20),
    created_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    session_id BIGINT NOT NULL REFERENCES gym_sessions(id) ON DELETE RESTRICT,
    status VARCHAR(12) NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    confirmation_code VARCHAR(20) UNIQUE,
    booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    CONSTRAINT checkin_requires_code
        CHECK (checked_in_at IS NULL OR confirmation_code IS NOT NULL)
);

-- A member cannot have two active bookings for the same session.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_member
    ON bookings(user_id, session_id)
    WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS bookings_by_session_status
    ON bookings(session_id, status);

CREATE INDEX IF NOT EXISTS bookings_by_member
    ON bookings(user_id, booked_at DESC);

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    session_id BIGINT NOT NULL REFERENCES gym_sessions(id) ON DELETE RESTRICT,
    status VARCHAR(12) NOT NULL DEFAULT 'WAITING'
        CHECK (status IN ('WAITING', 'PROMOTED', 'CANCELLED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A member may have only one active waitlist entry per session.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_waitlist_entry
    ON waitlist_entries(user_id, session_id)
    WHERE status = 'WAITING';

CREATE INDEX IF NOT EXISTS waitlist_fifo
    ON waitlist_entries(session_id, joined_at, id)
    WHERE status = 'WAITING';
