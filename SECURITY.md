# Security notes

How authentication controls are configured (OWASP ASVS v5, level 1).

## Sign-in methods
- **Passkey (WebAuthn)** is the normal way to sign in. The private key never
  leaves the user's device; the server stores only the public key.
- **Account recovery** is hidden behind "Lost your passkey?". It needs the
  email, the birth year and the recovery password set earlier in the dashboard.

## Password policy (ASVS 6.2)
- Minimum length **15** characters (`MIN_PASSWORD_LENGTH` in `lib/password.ts`),
  maximum 128. No composition rules (no required digits/symbols/case).
- Passwords are never trimmed, truncated or case-changed before checking.
- Stored only as a salted **scrypt** hash.
- Changing the recovery password requires the **current** recovery password
  (`app/api/recovery/set/route.ts`). Setting it for the first time requires being
  signed in with a passkey.

## Brute-force / credential-stuffing controls (ASVS 6.1.1, 6.3.1)
Implemented in `lib/rateLimit.ts`:

| Where | Limit | Lockout |
|---|---|---|
| Recovery (`/api/recovery/verify-info`, `/api/recovery/login`) | 5 failed attempts per email | 15 minutes |
| Changing the recovery password (`/api/recovery/set`) | 5 wrong current-password attempts per user | 15 minutes |

- Failures are counted per email, whether or not the account exists, so the
  limit does not reveal which emails are registered.
- Recovery allows **one** password attempt per successful birth-year check.
- Unknown email, wrong birth year, wrong password and "no recovery set" all
  return the same generic message.
- Lockout is temporary and per email, so an attacker can slow down one account
  but the lock expires on its own (no permanent lockout).
- To change the limits, edit `MAX_FAILS` and `WINDOW_MS` in `lib/rateLimit.ts`.
- Counters are kept in memory and reset when the server restarts.
- Passkey sign-in has no attempt counter: it needs the user's device key and
  screen lock, and the sign-in options are identical for unknown emails.

## Sessions (ASVS 7.2)
- Sessions are encrypted `iron-session` cookies (`httpOnly`, `sameSite=lax`,
  `secure` in production), verified on the server.
- On every successful login (passkey sign-in, passkey registration, recovery)
  the old session data is cleared and a new cookie is issued.
- Known limitation: logout deletes the cookie, but a copied cookie stays valid
  until it expires, because there is no server-side session store.
