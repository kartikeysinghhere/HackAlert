# Security Architecture Upgrade: Secure Session Management

The authentication system has been upgraded from a vulnerable localStorage-based JWT system to a production-grade secure session architecture using HttpOnly cookies and token rotation.

## 1. Vulnerability Mitigation
- **XSS Protection:** Access and Refresh tokens are now stored in **HttpOnly** cookies. This makes them inaccessible to JavaScript, completely mitigating token theft via XSS.
- **Session Hijacking Mitigation:** Tokens are configured with `Secure` (production only) and `SameSite=Strict` flags, preventing CSRF and ensuring tokens are only sent over encrypted connections.
- **Replay Attack Prevention:** Implemented **Refresh Token Rotation**. Each refresh token can be used only once. When a new access token is requested, a new refresh token is issued, and the old one is invalidated.
- **Breach Detection:** If an invalidated refresh token is reused, the system detects it as a potential breach and revokes all active sessions for that user.

## 2. Token Strategy
- **Access Token (Short-lived):** 15-minute expiry. Used for regular API authorization.
- **Refresh Token (Long-lived):** 7-day expiry. Used to obtain new access tokens without requiring user re-authentication.

## 3. Backend Implementation Details
- **Cookie-Parser:** Integrated to handle signed/unsigned cookies.
- **Session Revocation:** A `refresh_tokens` table in Supabase tracks active sessions, allowing for immediate global logout or targeted session invalidation.
- **Clean Architecture:** Auth logic remains encapsulated in `auth.service.js` and `auth.controller.js`, with a dedicated `auth.js` middleware.

## 4. Frontend Compatibility
- **Fetch Wrapper:** A transparent wrapper around `window.fetch` automatically includes credentials (cookies) and handles 401 errors by attempting a background token refresh.
- **Minimal Disruption:** Existing frontend logic that relies on `localStorage` for non-sensitive user data (name, email) remains functional.
