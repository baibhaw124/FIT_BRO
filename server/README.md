# FIT_BRO backend — next milestone

This directory is intentionally a placeholder in the frontend-first delivery. The backend will be built as a separate Node.js + Express API with Prisma and PostgreSQL after the client UI and flows are reviewed.

Planned modules: `src/routes`, `src/controllers`, `src/services`, `src/middleware`, `prisma/schema.prisma`, migrations, seed data, tests, and `.env.example`.

Required challenge behavior includes server-enforced authentication/roles/ownership, capacity-safe booking transactions, cancellations, FIFO waitlist promotion, one-time in-hour check-in codes, server validation and consistent error responses. Google Authenticator TOTP will be implemented here, not simulated in the browser.
