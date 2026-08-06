# mMori Frontend — Analysis & Improvement Plan

> Assessment of the Angular 18 app in `src/`, and a phased plan to fix it.
> Companion to [`BACKEND_SPEC.md`](BACKEND_SPEC.md) and [`backend/README.md`](backend/README.md).

---

## 1. Where the app stands today

The core idea is genuinely good: a *memento mori* dashboard that renders your life as a grid
of 52-dots-per-row weeks, wrapped around a fitness and mood tracker. The D3 life chart, the
adjusted life-expectancy figure, and the mood-to-recommendation loop all work.

Around that core sit two layers of debt. The first is ordinary: dead imports, copy-pasted
components, `any` everywhere. The second is more misleading — a batch of "enhancement"
services (notifications, sanitisation, typed models, a weight-history chart) that were
**written and documented but never wired into the app**. `README_ENHANCEMENTS.md` describes
them as features. They are not; they are unreferenced files.

### Measured state of the toolchain

Verified by running each command against a clean `npm install`:

| Command | Result |
|---|---|
| `npm run build` | ✅ succeeds — **922.60 kB initial bundle, 410.60 kB over the 512 kB budget** (warns) |
| `npm run lint` | ❌ **fails to start.** ESLint 9 requires `eslint.config.js`; the repo has `.eslintrc.json` |
| `npm test` | ❌ **22 of 23 specs fail** — mostly `NullInjectorError: No provider for HttpClient` |
| CI | ❌ none — no `.github/workflows` |

So there is no working quality gate of any kind right now. That shapes the plan below: the
first refactor without a safety net is the one that silently breaks something.

> **Update:** the table above is the state at assessment time, kept as the record that
> motivated this plan. All four rows are resolved as of Phase 2 — lint runs (0 errors),
> 44 tests pass, the budget is a deliberate ratchet, and CI runs all of it.

---

## 2. Findings

### P0 — Broken behaviour

**P0.1 Authentication does not survive a page reload.** `AuthGuard` (`src/app/guards/auth.guard.ts:24`)
reads `UserService.logged`, an in-memory `BehaviorSubject` seeded `false`. Nothing ever
subscribes to `AngularFireAuth.authState`. So any hard refresh — or opening a bookmark, or
the PWA relaunching — drops the user on `/log-in` even with a valid Firebase session. The
guard writes a `returnUrl` query param that no component reads.

**P0.2 Signup dead-ends.** `FirstTimeComponent.onSubmit()` navigates to `/main`
(`src/app/first-time/first-time.component.ts:227`). That route does not exist — the routes
are `/home`, `/first-time`, `/log-in`.

**P0.3 The dashboard leaks subscriptions and multiplies requests.** `DisplayDailyComponent.ngOnInit`
ends with `refreshTrigger$.subscribe(() => this.ngOnInit())` (`display-daily.component.ts:57`).
Each refresh re-enters `ngOnInit` and adds another trigger subscription, so the handler count
doubles every time the user logs a training: 1 → 2 → 4 → 8 requests per submit.

**P0.4 `retry(2)` applies to writes.** The interceptor retries every request
(`http-interceptor.service.ts:38`). A POST that succeeds slowly can be sent three times —
three weigh-ins, three training rows, three inflated `training_count` values.

**P0.5 Production config points at localhost.** `environment.ts` is `production: true` with
`apiUrl: 'http://localhost:3000'`. A production build ships pointing at the developer's
machine, and would be blocked as mixed content over HTTPS anyway.

**P0.6 The unit test suite is red.** 22/23 failing. Specs never got `HttpClientTestingModule`
or router/Firebase providers.

### P1 — Security

**P1.1 The API trusts a client-supplied `user_id`.** Firebase authenticates the user in the
browser and then nothing downstream uses it: the ID token is never attached to a request, and
every call identifies the caller by a string in the query or body. Anyone who can reach the
API can read or write any user's data by guessing a uid. Authentication exists;
**authorization does not.** This is `BACKEND_SPEC.md` §9.3, still unresolved — but now that
the backend is in this repo it is fixable end to end. **Phase 4 below is the full design.**

**P1.2 Unsanitised `[innerHTML]` on model output.** `ThoughtsComponent.formatRecommendation`
builds HTML with regex replaces and binds it via `[innerHTML]`
(`thoughts.component.html:19`). Angular's default sanitiser strips scripts, so this is not
directly exploitable — but the app ships a `SanitizationService` for exactly this and doesn't
use it, and the string comes from an LLM whose output nobody controls.

**P1.3 Arbitrary iframe injection in the stretch catalogue.** `StretchItemComponent.sanitizeUrl`
calls `bypassSecurityTrustResourceUrl` on a user-supplied URL after a naive
`watch?v=` → `embed/` replace (`stretch-item.component.ts:16`). The catalogue is **global and
unauthenticated**, so any user can put any URL in an iframe for every other user. The name
`sanitizeUrl` is actively misleading: it does the opposite.

### P2 — Dead code and unmet claims

Verified by grep — zero references outside their own definitions:

| Artifact | Status |
|---|---|
| `components/weight-history-chart/` | Complete D3 chart with tooltips. **Never rendered.** |
| `services/notification.service.ts` | **No call sites.** `GlobalErrorHandler` still uses `alert()` |
| `services/sanitization.service.ts` | **No call sites** |
| `models/` (6 interface files) | Used only by the orphaned chart; everything else is `any` |
| `log-out/` component | Unused — the nav menu has its own copy of `signOut()` |
| `.app-container` in `styles.scss` | Class never appears in any template |
| `import { response } from "express"` | Dead import in **4** components |
| `HttpProgressState` / `HttpState` | Defined **twice** (`models/` and `interceptor/`); only one used |

`README_ENHANCEMENTS.md` also claims **"Lazy Loading: Route-based code splitting"**. There is
no `loadChildren` anywhere; all three routes are eager.

`providers: [AuthService]` appears on three components, each creating a private instance of
an already-root-provided service.

### P3 — Dark mode is decorative

`src/styles/themes.scss` defines 20 CSS custom properties for both themes. **Not one component
stylesheet uses them.** All 14 component stylesheets hardcode colours (`#333`, `white`,
`rgba(...)`, neon gradients). Because Angular's view encapsulation gives component rules
higher specificity than the global theme rules, the toggle changes little more than the body
background — the cards, headers and forms stay light-themed. The feature reads as shipped and
is effectively broken.

### P4 — Architecture

- **Routing is bypassed.** `MainPageComponent` swaps four views with `*ngIf` on a string
  (`currentView`) rather than child routes. Consequences: no deep links, no working back
  button, no per-view lazy loading, and the route guards are duplicated as `*ngIf` conditions
  in the template. Two sources of truth for "is the user logged in / new".
- **Hybrid module setup.** `AppModule` declares 3 components and imports 12 standalone ones.
  Angular 18 supports full standalone with `bootstrapApplication`.
- **No `OnPush`, no `trackBy`, no signals.** Manual `cdr.detectChanges()` calls instead.
- **`any` everywhere** despite `strict: true` and `strictTemplates: true` in `tsconfig.json`.
  The typed models exist; nothing imports them.
- **Response-shape guessing.** Three components each contain the same
  `Array.isArray(response) || response.data || response.trainings` ladder — written because
  the backend contract was unknown. It is known now.
- **Duplicated business logic.** BMI, age and weeks-remaining are computed in
  `DisplayDailyComponent` *and* in the backend's `life-methods.service.ts`. Two
  implementations, one of them untested.
- **Three near-identical repository components** (training, stretch) with copy-pasted fetch,
  toggle-form and submit logic.

### P5 — UX and accessibility

- The life-expectancy chart opens from a **clickable `<h2>`** (`display-daily.component.html:26`)
  — not a button, no keyboard access, no `role`, no focus trap, no Escape to close.
- **"IBM" is shown to users twice** where "BMI" is meant.
- `header.component.html:1` is malformed: `<header link href="..." rel="stylesheet">` — the
  stylesheet attributes are on the `<header>` element, so the Press Start 2P font never loads.
- **No error or empty states.** Every failed request is a `console.log`; the user sees stale
  or zeroed numbers with no explanation.
- **No form validation messages.** Buttons disable, but nothing says why.
- Gender "other" is offered at signup, but the `life_expectancy` reference data only has
  Male/Female rows — those users silently get a base life expectancy of `0`.
- Nav menu has no active state.

---

## 3. The plan

Six phases, ordered so each one makes the next safer. Phases 1–2 are worth doing regardless;
everything after that is a judgement call about how far to take the app.

Effort is rough, assuming one developer working in focused sessions.

### Phase 1 — Stop the bleeding (~1–2 days) — ✅ **DONE**

Small, surgical, high-value. No refactoring.

**Verified** with a headless-browser smoke test against `ng serve`: an anonymous user is
redirected `/` → `/log-in?returnUrl=%2Fhome` and `/first-time` → `/log-in?returnUrl=%2Ffirst-time`,
with `/log-in` staying put — so the app bootstraps, `APP_INITIALIZER` resolves rather than
hanging, and the guards agree with each other. Both `ng build` configurations compile.

One item is only partly closed: **1.6 still points `environment.ts` at localhost**, because
the deployed API URL isn't known. The file-replacement plumbing is in place and the file
carries a `TODO`; set the real URL before a production build.

| # | Task | Files |
|---|---|---|
| 1.1 | Subscribe to `AngularFireAuth.authState` at bootstrap; drive `logged`/`userId` from it; make `AuthGuard` wait for the first resolved auth state instead of reading a default `false` | `services/user.service.ts`, `guards/auth.guard.ts`, `app.component.ts` |
| 1.2 | Honour `returnUrl` after login | `log-in.component.ts` |
| 1.3 | Fix the `/main` → `/home` navigation | `first-time.component.ts:227` |
| 1.4 | Move the refresh subscription out of `ngOnInit`; extract the load into `loadDashboard()`; add `takeUntilDestroyed` | `display-daily.component.ts` |
| 1.5 | Restrict `retry(2)` to idempotent methods (GET/HEAD) | `interceptor/http-interceptor.service.ts` |
| 1.6 | Set `environment.ts` to a real API URL; keep localhost only in the development file | `environments/` |
| 1.7 | Rename the user-visible "IBM" → "BMI"; fix the malformed `<header>` tag | `display-daily.component.html`, `header.component.html` |

**Exit criteria:** reload on `/home` keeps you logged in; signup lands on the dashboard;
logging a training fires exactly one set of requests.

### Phase 2 — A working quality gate (~1–2 days) — ✅ **DONE**

Nothing below this line is safe to attempt until the suite is green and runnable.

**Outcome:** `npm run lint` runs for the first time (0 errors, 68 warnings of known Phase 3
debt); the suite went from 22 failures out of 23 to **44 passing**; and CI runs lint, test
and build for the frontend plus typecheck, test and build for `backend/` — with a MongoDB
service container, so the 31 backend integration tests execute instead of skipping.

**Task 2.5 decision — the budget is now a ratchet, not an aspiration.** The initial bundle
is 924 kB against a 512 kB budget, so every build warned and the warning had stopped meaning
anything. Rather than delete the budget or leave it permanently red, the threshold is set
just above current size (`maximumWarning: 950kB`, `maximumError: 1.1MB`). Today's build
passes clean, and *any growth from here trips it* — which is what a budget is for. Phase 6.6
is what lowers the number; until then this at least stops the bundle getting quietly worse.

| # | Task |
|---|---|
| 2.1 | Migrate ESLint to flat config (`eslint.config.js`) and add `angular-eslint` so templates are actually linted |
| 2.2 | Fix the 22 failing specs — `provideHttpClientTesting`, router and Firebase test providers |
| 2.3 | Replace the `should create` stubs with real assertions on the logic that matters: `calculateAge`, `calculateBMI`, `determineBMIStatus`, `calculatePercentage`, the guards, and `UserService.handleUserLogin` |
| 2.4 | Add a GitHub Actions workflow running `lint`, `test`, `build` for the frontend and `typecheck`, `test` for `backend/` |
| 2.5 | Decide the bundle budget deliberately — either raise it with justification or treat 922 kB as a bug to fix in Phase 6 |

**Exit criteria:** `npm run lint`, `npm test` and `npm run build` all pass locally and in CI.

### Phase 3 — A typed, honest API layer (~2–3 days) — ✅ **DONE**

The backend contract is now written down and owned in this repo. Encode it once.

**Outcome:** no `any` left in `src/app/services/`; lint warnings fell from 68 to 26; 43
tests and the build stay green.

**Deviation from 3.2 as written.** The task said to add `training_name` and `stretch_name`
to the models. Instead the *frontend* moved to the backend's canonical `name`, because this
repo owns both halves and the API already returns canonical fields. Same for the write path:
the app now sends `training_date`/`training_type`, `training_frequency`, `country`,
`smoking_status`, `drinking_status`, and wraps `mood_data`/`stretch` correctly.

**This makes the backend's compatibility aliases removable** — the frontend no longer relies
on a single one. They are still in place (harmless, and they keep any older client working);
deleting them is a tidy follow-up, not urgent.

| # | Task |
|---|---|
| 3.1 | Type every service against `src/app/models/` — delete the `any` signatures in `UserService`, `UserDataService`, `ThoughtsService`, and the two repository services |
| 3.2 | Correct the models to match reality: `TrainingRepository` needs `training_name`, `Stretch` needs `stretch_name` and `video_link`, `MoodType` must match the lowercase values `ThoughtsComponent` actually sends |
| 3.3 | Delete the triple response-shape guessing in the three components; the backend returns `{ success, data }` |
| 3.4 | Collapse the duplicate `HttpProgressState`/`HttpState` definitions to one |
| 3.5 | Align request field names with the backend's canonical names (`training_frequency`, `country`, `training_date`, `training_type`, `name`). The backend accepts both spellings today, so **this can land without a backend change** — then the aliases become removable |
| 3.6 | Delete the 4 dead `express` imports, the unused `LogOutComponent`, `.app-container`, and the three redundant `providers: [AuthService]` |

**Exit criteria:** no `any` in `src/app/services/`; `strictTemplates` passes with real types.

### Phase 4 — End-to-end Firebase authentication — 🟡 **PARTLY DONE**

**Done:** 4.1 (token attached, scoped to `apiUrl`, one forced-refresh retry on 401),
4.2.1–4.2.4 (`firebase-admin`, `requireAuth`, uid derived from the token, `checkRevoked`
switch), the §4.2 route policy, 4.4 (`AUTH_MODE` staged rollout) and the backend half of
4.5 — 12 tests with `verifyIdToken` stubbed, so CI needs no credentials.

`AUTH_MODE` defaults to `optional`: tokens are verified when present and logged when absent,
but nothing is rejected. **Set `AUTH_MODE=required` to actually enforce**, once the frontend
is deployed and the unauthenticated-request warnings stop.

**Also done since:** 4.1.7 (`npm run config:env` regenerates `environment.ts` from
`FIREBASE_*` / `API_URL`; opt-in, so an unset key leaves the committed file alone and local
builds need no setup) and the frontend half of 4.5 (5 interceptor specs — token attached to
our API, *not* attached to other hosts, absent when signed out, one forced-refresh retry on
401, and no retry loop).

**4.3 done.** P1.2 and P1.3 are closed. The iframe source is now built from a validated
11-character video id, so nothing a user types reaches it, and the link is validated on the
server too. The recommendation renders as structured data with no `[innerHTML]` anywhere.

**4.2.5 done.** `POST /generate_recommendation` is throttled — 10 per hour by default,
configurable — keyed on the **verified uid** where one is present rather than the IP, since
an IP is shared behind a NAT and a signed-in abuser can change networks. Returns 429 with
`Retry-After`. State is in memory, which is right for one instance and wrong for several:
scaling out means moving it to a shared store.

**4.3.3 done — Phase 4 complete.** Catalogue entries record the verified uid of whoever
added them, so a bad entry is traceable. Deliberately **not serialised**: provenance is for
whoever operates the service, and returning other users' uids to every client would be a
small privacy leak of its own.

**Phase 4 is finished. So is the plan** — every task across all six phases is either done or
recorded with the reason it was stopped.

**4.1.6 done — the rollout is complete.** No request carries a `user_id` any more: reads
send no query parameter and every payload omits it, so identity exists solely in the verified
token.

**This is a breaking operational change.** `AUTH_MODE` now defaults to `required` — leaving
it `optional` would mean unauthenticated requests arriving with no user and quietly reading
nothing, a silent empty dashboard instead of a clear 401. **Firebase Admin credentials are
now mandatory.** For local work without them, set `AUTH_MODE=disabled`.

#### Original scope (~4–6 days, spans both halves of the repo)

The largest correctness gap in the product, and the only phase that changes the frontend and
the backend together.

#### 4.0 What exists and what doesn't

Today Firebase is a **login screen**, not a security boundary:

- `AuthService` signs in with `firebase.auth.GoogleAuthProvider` via
  `afAuth.signInWithPopup()`. Google is the only provider.
- Firebase mints an ID token on sign-in. **The app never reads it.** There is no
  `Authorization` header anywhere in the codebase — `HttpInterceptorService` only clones the
  request and adds timeout/retry.
- The API identifies the caller by a `user_id` **string in the query or body**, trusted
  verbatim. Change the string, read another user's profile, weight history and moods.
- `AuthGuard` reads an in-memory `BehaviorSubject`, not `AngularFireAuth.authState`, so the
  client's own notion of "logged in" is not anchored to Firebase either.

So authentication is Firebase; **authorization does not exist**. The goal of this phase is
that the server derives identity from a cryptographically verified token and stops trusting
the client entirely.

One piece of good news for the migration: `user_id` already holds the Firebase `uid`, on
every existing document. **No data migration is required** — the values are already correct,
they are simply unverified.

#### 4.1 Frontend — obtain and attach the token

| # | Task | Files |
|---|---|---|
| 4.1.1 | Expose the token as a stream. `AngularFireAuth` gives `idToken: Observable<string \| null>`; prefer `currentUser.getIdToken()` per request, which returns a cached token and **auto-refreshes when within ~5 minutes of the 1-hour expiry**. Do not cache the token yourself | new `services/auth-token.service.ts` |
| 4.1.2 | Add an `AuthInterceptor` that attaches `Authorization: Bearer <idToken>`. **Scope it to `environment.apiUrl` only** — never attach the token to third-party hosts | new `interceptor/auth.interceptor.ts` |
| 4.1.3 | Handle expiry: on a `401`, call `getIdToken(true)` to force-refresh and retry **once**. If the retry also 401s, sign out and route to `/log-in` with `returnUrl`. Guard against retry loops | `interceptor/auth.interceptor.ts` |
| 4.1.4 | Requests that fire before auth resolves must wait, not go out bare. Gate the interceptor on the first settled `authState` emission | `auth-token.service.ts` |
| 4.1.5 | Delete the three `providers: [AuthService]` declarations so there is one auth instance, not four | `log-in`, `log-out`, `navigation-menu` |
| 4.1.6 | Stop sending `user_id` in request bodies and query params once the server derives it (staged — see 4.4) | all services in `services/` |
| 4.1.7 | Move the Firebase config out of the committed `environment*.ts` into build-time substitution. Web API keys are public by design, so this is hygiene rather than a vulnerability — but the project ID and auth domain should not be a code change to rotate | `environments/` |

**Dependency:** 4.1 requires **Phase 1.1** (subscribe to `authState`). Until session state
survives a reload, there is no reliable token to attach.

#### 4.2 Backend — verify the token

| # | Task | Files |
|---|---|---|
| 4.2.1 | Add `firebase-admin`. Initialise from a service account: `FIREBASE_SERVICE_ACCOUNT_JSON` (inline JSON) or `GOOGLE_APPLICATION_CREDENTIALS` (path). **This is a real secret** — unlike the frontend config — so it must never be committed | new `backend/src/config/firebase.ts` |
| 4.2.2 | Write `requireAuth` middleware: parse `Authorization: Bearer`, call `admin.auth().verifyIdToken(token)`, attach `req.auth = { uid, email }`. Reject with the existing envelope — `401 { success: false, error: 'Unauthorized' }` — so clients keep one error shape | new `backend/src/middleware/require-auth.ts` |
| 4.2.3 | **Derive `user_id` from `req.auth.uid`** in every controller. If the body also carries a `user_id` and it differs, answer `403`, don't silently prefer one — a mismatch means either a bug or an attempt | all files in `backend/src/controllers/` |
| 4.2.4 | Decide `checkRevoked`. `verifyIdToken(token, true)` catches sign-out-everywhere and disabled accounts, at the cost of a network round trip per request. Recommendation: leave it off for reads, enable for writes | `require-auth.ts` |
| 4.2.5 | Add rate limiting on `POST /generate_recommendation` — it spends real money per call and is currently callable in a loop by anyone | `backend/src/app.ts` |

**Route policy.** Everything except the health check requires a verified token:

| Route | Policy | Why |
|---|---|---|
| `GET /up` | public | Health checks must not need credentials |
| `/user_data`, `/user_data/user_data` | **auth, uid-scoped** | Personal profile data |
| `/trainings/*`, `/weight_updates/*` | **auth, uid-scoped** | Personal history |
| `/moods`, `/generate_recommendation` | **auth, uid-scoped** | Personal + costs money per call |
| `GET /training-repository`, `GET /stretches` | **auth** | Global catalogues; the app requires login anyway |
| `POST /training-repository`, `POST /stretches` | **auth** | Global *write* surface — see below |

The catalogue writes deserve emphasis: they are global, and `POST /stretches` accepts a URL
that `StretchItemComponent` renders in an iframe for **every** user. Unauthenticated write
access to that is the most exploitable thing in the app today. Authentication narrows it;
task 4.3 closes it.

#### 4.3 Remaining input-trust issues

| # | Task |
|---|---|
| 4.3.1 | Replace `bypassSecurityTrustResourceUrl` with real validation — parse the URL, require a YouTube host, extract the video ID, rebuild the embed URL from the ID. Reject anything else. Validate on the **server** too; a client-side check is a UX affordance, not a control. Rename the method, which currently claims to sanitise while doing the opposite |
| 4.3.2 | Render the AI recommendation as structured data or via a real Markdown renderer, instead of regex-built HTML bound with `[innerHTML]`. Angular's sanitiser makes this survivable today, but the string is model output that nobody controls |
| 4.3.3 | Consider recording `created_by: uid` on catalogue entries, so a bad entry can be traced and removed |

#### 4.4 Rollout — how to ship this without breaking the live app

Verification cannot be switched on in one commit: the moment the server requires a token, any
client that isn't sending one breaks. Stage it.

1. **Backend, permissive.** Ship `requireAuth` behind `AUTH_MODE=optional` (default). Verify
   the token when present, attach `req.auth`, but do not reject. Log how many requests arrive
   unauthenticated.
2. **Frontend, attach.** Ship 4.1. Every request now carries a token. Watch the log from
   step 1 fall to zero.
3. **Backend, enforce.** Flip to `AUTH_MODE=required`. Unauthenticated requests now 401.
4. **Backend, stop trusting the body.** Derive `user_id` from the token; 403 on mismatch.
5. **Frontend, stop sending it.** Remove `user_id` from bodies and query strings (4.1.6).
6. **Clean up.** Delete `AUTH_MODE` and the permissive path.

Steps 1–2 are independently revertible, which is the point of the split.

#### 4.5 Test coverage this phase must add

Backend, with `verifyIdToken` mocked — no network, no real credentials in CI:

- valid token → `req.auth.uid` populated, request proceeds
- missing header, malformed header, expired token, token from another Firebase project → `401`
- body `user_id` ≠ token `uid` → `403`
- each user-scoped route reads and writes only the token's `uid` — the direct test for the
  vulnerability being fixed
- `AUTH_MODE=optional` lets an unauthenticated request through; `required` does not

Frontend:

- interceptor attaches the header to `apiUrl` requests and **not** to other hosts
- a `401` triggers exactly one force-refresh and retry
- a second `401` signs out and redirects
- requests issued before auth resolves wait rather than going out bare

#### 4.6 Explicitly out of scope

- Additional sign-in providers. Google-only is a product decision, not a security gap.
- Custom claims / roles. There is one kind of user.
- Session cookies. Bearer tokens fit a SPA talking to a JSON API; cookies would add CSRF
  surface for no gain here.
- Refresh-token handling. The Firebase SDK owns that; reimplementing it would be a regression.

**Until this phase ships, do not expose the backend beyond localhost.** Any caller who can
reach it can read and write any user's data by guessing a `uid`.

### Phase 5 — Architecture — 🟡 **PARTLY DONE**

**Done: 5.1, 5.2, 5.3, 5.4, 5.6.** The four views are lazily-loaded child routes under `/home`, which
took the initial bundle from 926.68 kB to **860.04 kB** and made every view a real URL —
verified in a browser: `/home/trainings` now redirects to
`/log-in?returnUrl=%2Fhome%2Ftrainings`, so a deep link survives login. `MetricsService`
holds the age/BMI/weeks logic with its tests moved alongside it, and `trackBy` is on every
list.

**5.2 done too:** `AppModule` and `AppRoutingModule` are gone. `main.ts` calls
`bootstrapApplication(AppComponent, appConfig)`, routes live in `app.routes.ts`, and every
provider lives in `app.config.ts`. Initial bundle **860.04 kB → 844.49 kB**; routing verified
unchanged in a browser afterwards.

**5.3 done:** both catalogues now extend `CatalogueComponent`, which owns the fetch /
toggle / submit / refetch cycle plus loading and error state. Each subclass is down to three
members — what to fetch, what to create, and the form — so a change to the cycle happens
once instead of twice.

**5.5 done, with a stated boundary.** Twelve components run `ChangeDetectionStrategy.OnPush`.
Where state arrives asynchronously it moved to signals first — writing a signal marks the
view dirty, whereas assigning a field under OnPush leaves a completed request invisible.
`CatalogueComponent` holds its state in signals, so both catalogue views inherit that safely.
Verified in a browser rather than by unit test, since OnPush faults are runtime-only: the
theme toggle (an OnPush component driven by a signal) flips its icon, with no page errors.

The manual `cdr.detectChanges()` calls the plan set out to remove were already gone — Phase 1
deleted them along with `MainPageComponent`'s duplicated auth state.

**Not converted:** `DisplayDailyComponent`, `InputDailyComponent`, `ThoughtsComponent` and
`FirstTimeComponent` still hold async state in plain fields and stay on default change
detection. They are correct as they are; converting them is the same signal-first pattern
applied to more fields.

#### Original scope (~4–6 days)

The largest phase, and the most optional. Do it if the app is going to keep growing.

| # | Task |
|---|---|
| 5.1 | Replace the `currentView` string switch with **child routes** under `/home` (`daily`, `trainings`, `stretches`, `thoughts`), lazily loaded. Delivers deep links, a working back button, real code splitting, and deletes the duplicated guard logic from `main-page.component.html` |
| 5.2 | Go fully standalone; drop `AppModule` for `bootstrapApplication` with `provideRouter`/`provideHttpClient` |
| 5.3 | Extract the shared repository behaviour — one generic catalogue component or a shared base service — replacing the copy-paste across training and stretch |
| 5.4 | Move BMI/age/weeks calculations into a `MetricsService` with unit tests, so the frontend and backend agree by construction |
| 5.5 | Adopt `OnPush` + signals for component state; drop the manual `cdr.detectChanges()` calls |
| 5.6 | Add `trackBy` to every `*ngFor` |

### Phase 6 — Make the promised features real — 🟡 **PARTLY DONE**

**Phase 6 complete.**

- **6.3** The weight chart renders. It was a complete component with no data source — the
  API only exposed `latest_weight` — so `GET /weight_updates/history` was added (additive;
  no existing client affected) and the dashboard now fetches and passes the series.
- **6.2** `NotificationService` has callers at last. A toast host is mounted next to the
  spinner and `GlobalErrorHandler` uses it, so `alert()` is gone.
- **6.4** The chart modal is a real dialog: `role`/`aria-modal`, `cdkTrapFocus` (from the
  CDK already in the dependency list) to keep Tab inside and restore focus on close, Escape
  to dismiss, and a real `<button>` close control.
- **6.7** Gender "other" no longer silently yields a base of 0 — with no matching row, the
  Male and Female figures for that country are blended.

- **6.1** Dark mode works. All 13 component stylesheets now read theme tokens instead of
  hardcoded colours — verified in a browser that the *computed* button background differs
  between themes (`rgb(194, 0, 92)` light vs `rgb(255, 0, 119)` dark), which is what the
  toggle never achieved before. The header and life-expectancy chart deliberately stay dark
  in both themes: the neon glow only reads against a dark backdrop, and they are the app's
  signature.

- **6.5** The dashboard has loading, error and no-profile states; the daily form explains
  which field is missing instead of only disabling its button, and reports success or
  failure through the toast from 6.2.
- **6.6** Initial bundle **926.68 kB → 571.65 kB** across Phase 5 and 6. Bootstrap was a
  phantom dependency — declared, never imported, not in the build — and is gone. Angular
  Material was carried entirely for two `<select>`s on the signup form; those are now native
  controls, which dropped the 73 kB prebuilt theme (styles: 72.97 kB → 3.28 kB). D3 is
  imported per module rather than as the meta-package. The budget is re-ratcheted to
  620 kB warn / 750 kB error.

**Not done from 6.6:** moving Firebase off the `compat` layer. It touches auth, the session
service and the interceptor at once, and the modular SDK's saving is smaller than the two
above — a deliberate stop, not an oversight.

#### Original scope (~3–5 days)

| # | Task |
|---|---|
| 6.1 | **Finish dark mode**: convert all 14 component stylesheets to the `themes.scss` custom properties. Currently the single biggest gap between what the docs claim and what users see |
| 6.2 | **Wire up `NotificationService`**: add a toast component, and have `GlobalErrorHandler` and every failed request use it instead of `alert()`/`console.log` |
| 6.3 | **Render `WeightHistoryChartComponent`** on the dashboard. Needs a backend endpoint for weight history — the API currently only exposes `latest_weight`. Small addition to `weight-updates.controller.ts` |
| 6.4 | Make the chart modal accessible: a real `<button>` trigger, `role="dialog"`, focus trap, Escape to close |
| 6.5 | Add empty, loading and error states per view; show form validation messages |
| 6.6 | Attack the 922 kB bundle: import only the D3 modules used (`d3-selection`, `d3-scale`, `d3-axis`, `d3-shape`, `d3-array`) instead of `import * as d3`; move Firebase from the `compat` layer to the modular SDK; drop Bootstrap or Angular Material — carrying both CSS frameworks is most of `styles.css` |
| 6.7 | Handle gender "other" — either add rows to the reference dataset or fall back to a blended figure rather than silently returning 0 |

---

## 4. Suggested sequencing

```
Phase 1 (bugs) ──┬─→ Phase 2 (quality gate) ──→ Phase 3 (types) ──┐
                 │                                                │
                 └─────────────→ Phase 4 (Firebase auth) ←────────┘
                                                   │
                             Phase 5 (architecture) ┤
                             Phase 6 (features/perf)┘
```

**Phase 4 depends only on Phase 1.1**, not on the whole of Phases 2–3. If the app is going
to be deployed anywhere reachable, do Phase 1 and then go straight to Phase 4 — Phases 2 and
3 make the work more pleasant, not more correct. If it stays on localhost, the ordering left
to right is the comfortable one.

Phases 1 and 2 are the ones I would not skip on any path: today the app logs users out on
refresh, and there is no test or lint run that could tell you if that got worse. Phases 5 and
6 are independent of each other and can be interleaved or dropped.

Two "if time is very limited" answers, depending on the goal:

- **To make the app usable:** Phase 1.1 alone (auth persistence). It is the difference
  between an app you can reload and one you cannot.
- **To make it safe to deploy:** Phase 1.1 → Phase 4. Nothing else on this list matters if
  any caller can read any user's data by guessing a uid.

## 5. Deliberately not proposed

- **Rewriting in another framework.** Nothing here is an Angular problem.
- **SSR.** `@angular/ssr`, `@angular/platform-server` and `express` are dependencies with no
  server target and no `server.ts`. The honest move is to **remove those three dependencies**,
  not to build SSR for an authenticated dashboard that would not benefit.
- **E2E tests.** Not worth the setup until Phases 1–3 have stabilised the surface.
- **Redesign.** The neon/CRT aesthetic is a deliberate choice; Phase 6.1 preserves it while
  making it theme-aware.
