# Hack/Alert Development Guide

## Build & Run
- `npm install`: Install dependencies
- `npm start`: Start the server (requires .env)

## Backend Architecture
- `config/`: Configuration files (Supabase, Groq, Env, Cron)
- `controllers/`: Request handlers
- `middleware/`: Custom middleware (Auth, Sanitize, Security, Validate)
- `routes/`: API route definitions
- `services/`: Business logic and external API integrations
- `sockets/`: SSE (Server-Sent Events) management
- `utils/`: Helper functions and common utilities (ErrorHandler, AsyncHandler)
- `validators/`: Logic-heavy validations

## Tech Stack
- Node.js/Express
- Supabase (Database)
- Groq (AI)
- Resend (Email alerts)

## Code Style
- Use `asyncHandler` for all controller methods.
- Keep business logic in `services`.
- Keep request/response handling in `controllers`.
