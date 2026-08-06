# Backlog

Everything still outstanding, written so a fresh session can pick any item up cold. Each
entry says **where**, **why it matters**, and **how to know it worked**.

Nothing here is blocking a local run — see [`README.md`](README.md) for that. The six-phase
audit in [`FRONTEND_IMPROVEMENT_PLAN.md`](FRONTEND_IMPROVEMENT_PLAN.md) is complete; this is
what was deliberately left, plus what the work itself uncovered.

**Baseline to preserve:** 61 frontend tests, 62 backend tests, 0 lint errors, 0 lint
warnings, 571 kB initial bundle. Any change should leave those the same or better.

```bash
npm run lint && npm run test:ci && npm run build     # frontend
cd backend && npm run typecheck && npm test && npm run build
```

---

## 1. Configuration — nobody but the owner can do these

Not code. The app runs locally without them (`AUTH_MODE=disabled`), but it is not
meaningful or deployable until they are done.

### 1.1 Firebase Admin credentials
`AUTH_MODE` defaults to `required`; without credentials every user-scoped request answers
401. Firebase Console → Project Settings → Service Accounts → Generate new private key, for
project `trainingapp-44fb4`. Put the JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` in
`backend/.env`, or point `GOOGLE_APPLICATION_CREDENTIALS` at the file.
**Never commit it** — unlike the web config, this one is a real secret.

*Done when:* signing in and loading the dashboard works with `AUTH_MODE=required`.

### 1.2 Real life-expectancy data
`backend/data/life_expectancy.sample.json` is **placeholder data** — six countries of round
illustrative numbers. The signup form offers ~180 countries, so most users currently get a
base of 0 and a meaningless "weeks left", with no error anywhere.

Source: WHO Global Health Observatory (life expectancy at birth) or World Bank
`SP.DYN.LE00.MA.IN` / `SP.DYN.LE00.FE.IN`. Shape and loader:
`npm run seed:life-expectancy -- ./real-data.csv` — see
[`backend/README.md`](backend/README.md#reference-data).

*Done when:* a Spanish male profile returns a plausible `base_life_expectancy`, not 0.

### 1.3 Production API URL
`src/environments/environment.ts` still has `apiUrl: 'http://localhost:3000'`. Either edit
it or export `API_URL` and run `npm run config:env`.

*Done when:* a production build points somewhere real. (A production build over HTTPS
calling `http://localhost` is also blocked as mixed content.)

### 1.4 `OPENAI_API_KEY` — optional
Only `POST /generate_recommendation` needs it. Without it that endpoint returns 422 and the
Thoughts screen shows the mood but no recommendation; everything else works.

---

## 2. Code — small, self-contained

### 2.1 Finish `OnPush` on the last four components
`DisplayDailyComponent`, `InputDailyComponent`, `ThoughtsComponent`, `FirstTimeComponent`
still hold async state in plain fields and run default change detection. They are **correct as
they are** — just not optimised.

Follow the pattern already used in `CatalogueComponent`: move async-updated fields to
`signal()` *first*, add `()` in the template, then add
`changeDetection: ChangeDetectionStrategy.OnPush`. Assigning a plain field under OnPush leaves
a completed request invisible on screen, which is why the signal step comes first.

⚠️ `OnPush` faults are **runtime-only** — unit tests that call `detectChanges()` by hand will
not catch them. Verify in a browser (`npm start`, then exercise the view).

### 2.2 Two stale `TODO` comments
- `src/app/services/error-handler.service.ts:106` — "Integrate with error monitoring service".
  Either wire up Sentry or delete the placeholder. Its unused `_error` parameter is
  underscore-prefixed to keep lint quiet; it is the argument Sentry would take.
- `src/environments/environment.ts:8` — resolved by item 1.3; delete the comment then.

**The lint warnings are gone** — the count is 0, and the run is clean. Keep it there: the
`any`s in the D3 charts were replaced with `Selection<SVGGElement, unknown, null, undefined>`
and a local `WeightPoint`, and D3's own callback types now infer the datum, so new chart code
should not need an annotation at all.

---

## 3. Code — larger, optional

### 3.1 Firebase `compat` → modular SDK
The last piece of plan item 6.6, deliberately skipped. It touches `AuthService`,
`UserService` and `AuthInterceptor` at once, and the bundle saving is smaller than the wins
already taken (Material and Bootstrap removal took the initial bundle from 926 kB to 571 kB).

Note the compat quirks the current code depends on: `afAuth.authState` is an Observable but
`afAuth.currentUser` is a **Promise** — the interceptor wraps it in `from()`. The modular SDK
differs on both.

*Done when:* no `@angular/fire/compat` import remains, the reload-keeps-you-signed-in
behaviour still holds (verify in a browser), and 61 tests still pass.

### 3.2 Rate limiter state is in-memory
`backend/src/middleware/rate-limit.ts` is correct for one instance and wrong for several —
each replica would enforce its own quota. Move to Redis **only if** the API is ever scaled
out. Documented in the file itself.

### 3.3 Backend integration tests skip without MongoDB
31 of them. They run in CI against a service container, and locally against
`TEST_MONGODB_URI` or an in-memory server. In a sandbox with neither they skip — by design,
so the other 62 still run. If `npm test` reports skips, that is why.

### 3.4 Catalogue behaviour is not directly tested
`CatalogueComponent` owns the fetch / toggle / submit / refetch cycle for both catalogues, but
its subclasses only have creation smoke tests. A spec for `load()` and `submit()` on the base
class would cover both views at once. Cheap, and it guards a shared code path.

---

## 4. Decisions to revisit, not bugs

Recorded so nobody "fixes" them by accident.

| Decision | Why | Where |
|---|---|---|
| Response envelopes are inconsistent (`error` vs `message`, 200-not-404, `POST /stretches` returns 200) | Reproduced from the spec on purpose; clients branch on the exact shape | `backend/README.md` §Response conventions |
| BMI band gaps **fixed**, diverging from the spec | The original ranges left holes where a BMI got the underweight penalty | `life-methods.service.ts` |
| Header and life chart stay dark in both themes | The neon glow only reads on a dark backdrop; they are the app's signature | `src/styles/themes.scss` |
| `created_by` is stored but never returned | Provenance is for whoever operates the service; returning other users' uids would be its own small leak | `backend/src/models/*-repository.model.ts` |
| A failed profile lookup resolves to `isNew: false` | Treating an unreachable API as "new user" would re-onboard an existing one and write a duplicate profile | `user.service.ts`, asserted in its spec |
| Backend still accepts `user_id` from a caller | Keeps the API usable by other clients; `requireAuth` overwrites it with the verified uid and 403s on a mismatch | `require-auth.ts` |
| `README_ENHANCEMENTS.md` still exists | Kept as the record of what was claimed versus what was true — that gap is why the audit happened | — |
