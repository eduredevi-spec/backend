# Backend Setup

## Environment variables

Use [`backend/.env`](./.env) as the current source of truth in this workspace.
Copy [`backend/.env.example`](./.env.example) to `.env` for new environments.

Required for the API to function correctly:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Required for OTP and password-reset email delivery:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

## Render deployment

Set these same environment variables in the Render service:

- `NODE_ENV=production`
- `MONGODB_URI=<your mongodb connection string>`
- `JWT_ACCESS_SECRET=<long random secret>`
- `JWT_REFRESH_SECRET=<different long random secret>`
- `CORS_ORIGIN=<your frontend origin>`
- `EMAIL_HOST=smtp.gmail.com`
- `EMAIL_PORT=587`
- `EMAIL_USER=<gmail address used to send OTP>`
- `EMAIL_PASS=<gmail app password>`
- `EMAIL_FROM=<from address shown in the email>`

For Gmail, `EMAIL_PASS` must be an App Password, not the normal account password.
If you copy it from the Google UI, store it exactly as accepted by your provider configuration.

## Symptoms of bad email env

If the SMTP variables are missing or invalid, auth routes that send email such as:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/resend-email-otp`
- `POST /api/v1/auth/forgot-password`

will now return a structured `503` JSON error with code `EMAIL_SERVICE_UNAVAILABLE` instead of hanging into an upstream `502`.
