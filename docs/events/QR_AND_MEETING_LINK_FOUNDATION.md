# QR Event Pass & Online Meeting-Link — Contract (Foundation Only)

Status: **FOUNDATION ONLY / NOT IMPLEMENTED**. Both features require durable
server-side state (to enforce single-use check-in and to store a private
meeting URL) which this sprint deliberately does not introduce — see the
Verification Report §18/19/20 for why. This document defines the contract so
the next sprint can implement against it without redesigning.

## QR Event Pass

Target flow (spec §13):

```
Confirmed Registration → secure pass identifier → QR → server-validated check-in
```

Contract:
- **Pass identifier**: reuse the existing HMAC-signed token primitive in
  `src/lib/events/token.ts`, with a dedicated payload shape
  `{ v: 1, registrationId, slug, type: 'checkin' }`. No attendee PII, payment
  data, or gateway secrets are encoded — only enough to identify the
  registration and event.
- **QR encoding**: the signed token string is what gets encoded into the QR
  image (e.g. via a `qrcode` library at render time), not a raw database ID.
- **Check-in validation**: a scanning endpoint verifies the signature (same
  `verifyRegistrationToken` logic already used by `/api/events/verify-registration`)
  and then must mark the token consumed so it cannot be replayed for a second
  check-in. That "mark consumed" step needs durable, shared storage —
  it cannot be done safely with the in-memory approach used elsewhere in this
  sprint, since a replayed QR code would otherwise validate every time.
- **Blocked on**: real persistence (deferred to the CCAvenue integration
  sprint alongside payment/order records).

## Online Meeting-Link Fulfilment

Target flow (spec §14):

```
Confirmed Registration → email → meeting/access link
```

Contract:
- The event record would carry a private field (not present on `EventRecord`
  today, deliberately — adding it before there's a real value to put there
  would be dead code) holding the real meeting URL, populated by
  iTelematics Admin at event configuration time.
- On confirmed registration, a transactional email is sent containing that
  link. The link is never rendered on any public page or API response, and
  is never included in a QR payload.
- Email delivery is not implemented this sprint (see Verification Report —
  no email provider is connected). The registration confirmation screen
  states this explicitly rather than claiming delivery that did not happen.
- **Blocked on**: choosing and connecting a real email provider (e.g.
  Resend) with a real API key.

## Why not stub these further this sprint

Both features' core safety property (single-use check-in; private-until-confirmed
link delivery) depends on state surviving across requests/cold starts, which the
in-memory primitives in this sprint explicitly cannot provide. Building a fake
version now would either be misleading (implying real single-use enforcement)
or dead code (a link field with nothing real to put in it). Defining the
contract here, instead, keeps the eventual implementation a drop-in once the
database exists.
