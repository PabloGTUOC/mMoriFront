# README_ENHANCEMENTS — superseded

This document described a set of "enhancements" as shipped features. An audit found that
several of them were **written but never wired into the application**, and the rest of the
file had drifted from the code around it.

It has been replaced rather than patched, because a document that is wrong in places is worse
than no document: it was cited as evidence that features existed.

## Where its content went

| For | See |
|---|---|
| What the app is, how to run it, stack and architecture | [`README.md`](README.md) |
| API setup, configuration, deviations from the spec | [`backend/README.md`](backend/README.md) |
| What was actually true, and what was done about it | [`FRONTEND_IMPROVEMENT_PLAN.md`](FRONTEND_IMPROVEMENT_PLAN.md) |

## What it claimed, and what was true

Kept as a record, because the gap is the reason the audit happened.

| Claim | Reality at the time | Now |
|---|---|---|
| "Lazy Loading: route-based code splitting" | No `loadChildren` anywhere; every route eager | ✅ Real — four lazily-loaded child routes |
| "🌓 Dark Mode" | 20 CSS variables defined; **no component stylesheet used them**, so the toggle changed almost nothing | ✅ Real — all component styles read theme tokens |
| "Weight History: interactive charts" | A complete D3 component that **nothing rendered**, with no endpoint to feed it | ✅ Real — rendered, with `GET /weight_updates/history` behind it |
| "Error Handling … user-friendly notifications" | `NotificationService` had **zero call sites**; the error handler used `alert()` | ✅ Real — a toast host, no `alert()` |
| "TypeScript Interfaces … type safety" | The models were used only by the orphaned chart; everything else was `any` | ✅ Real — services and payloads typed against the API contract |
| "Authentication … secure auth guards" | Firebase signed you in; **the token was never sent**, and the API trusted a `user_id` string from the client | ✅ Real — verified tokens, identity from the token only |
| "Input Sanitization: XSS and SQL injection protection" | `SanitizationService` had zero call sites | Claim withdrawn — the service is deleted; the two real problems were closed another way, see below |
| "Bootstrap 5.3", "Angular Material 18" | Bootstrap was never imported; Material was carried in full for two `<select>`s | Both removed |

## The one that was never true

**`src/app/services/sanitization.service.ts` is deleted.** It never had a caller. The two
problems it was written for were closed a different way, and better:

- The AI recommendation no longer passes through `[innerHTML]` at all — it is parsed into
  paragraphs, lists and bold runs and rendered as text, so there is no HTML to sanitise.
- The stretch video URL is not sanitised but *rebuilt*: only an 11-character YouTube video id
  is extracted, and the embed URL is constructed from it, on the client and again on the
  server.

The service was therefore dead code, and deleting it is what removes the claim. Its own
methods were also weaker than what replaced them: regex tag-stripping rather than a parser,
and an SQL-injection filter in an app whose only database is MongoDB.
