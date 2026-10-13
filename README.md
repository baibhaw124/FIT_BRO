PASTE THE README CONTENT HERE
# FIT_BRO — Gym Session Booking Platform

FIT_BRO is a full-stack gym booking application with a React frontend, Express REST API, and PostgreSQL database. It supports member authentication, session discovery, booking, waitlists, cancellation, and admin check-in.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, authored CSS, Lucide icons, Lottie
- **Backend:** Node.js, Express, JWT authentication, bcryptjs, Zod
- **Database:** PostgreSQL with `pg`
- **Tools:** Git, npm, PowerShell

## Prerequisites

Install Node.js, npm, and PostgreSQL. Create a PostgreSQL database named `gym_booking`.

## Configuration

Create environment files from the supplied examples:

- Root backend configuration: `.env.example` → `.env`
- Frontend configuration: `client/.env.example` → `client/.env`
- Backend configuration: `server/.env.example` → `server/.env`

Set the database credentials, a strong JWT secret, and the administrator credentials in the appropriate local environment files. Never commit real environment files or production secrets.

## Run the Application

Open separate terminals from the project root.

**Terminal 1 — Backend**

```bash
cd server
npm install
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd client
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:5000`. Confirm backend availability at `/api/health`.

Apply the SQL schema in `server/src/config/schema.sql` to the `gym_booking` database before using the API. Ensure an administrator account and test members exist in the database before testing role-specific flows.

## Main Features

- Member registration, password hashing, login, and JWT-protected API routes
- Admin-only session creation and session booking oversight
- Session browsing with remaining-seat information
- Capacity-aware booking and waitlisting when sessions are full
- Booking cancellation and FIFO waitlist promotion
- Booking confirmation codes and time-restricted admin check-in
- Member booking history and ownership enforcement
- Input validation, consistent API errors, and frontend loading and success states

## Routes

- `/` — Gym landing page and training programs
- `/login`, `/register` — Authentication
- `/sessions` — Browse and book sessions
- `/my-bookings` — View and cancel personal bookings
- `/admin` — Administrative session and check-in tools

## Production Build

```bash
cd client
npm run build
```

The generated frontend assets are placed in `client/dist/`.

## Design Note

1. The interface uses a cinematic, fitness-oriented visual style.
2. Responsive layouts support desktop and mobile screens.
3. React components separate pages, navigation, and program sections.
4. A dedicated API service layer isolates frontend network requests.
5. Express routes separate authentication, sessions, and bookings.
6. PostgreSQL constraints help protect booking and waitlist integrity.
7. JWT middleware enforces authenticated access and administrator roles.
8. Local animation assets reduce dependence on remote animation requests.

## Security

Public registration creates member accounts only. Administrator privileges must be assigned through a controlled administrative process. The backend—not frontend route guards—enforces authorization, ownership, booking limits, and check-in rules. Use strong credentials, keep secrets out of version control, and use HTTPS in production.