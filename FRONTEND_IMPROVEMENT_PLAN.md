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

**P1.1 The API trusts a client-supplied `user_id`.** The frontend holds a Firebase ID token
and never sends it; every request identifies the user by a string in the query or body.
Anyone can read or write any user's data by guessing a uid. This is `BACKEND_SPEC.md` §9.3,
still unresolved — but now that the backend is in this repo, it is fixable end to end.

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

### Phase 1 — Stop the bleeding (~1–2 days)

Small, surgical, high-value. No refactoring.

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

### Phase 2 — A working quality gate (~1–2 days)

Nothing below this line is safe to attempt until the suite is green and runnable.

| # | Task |
|---|---|
| 2.1 | Migrate ESLint to flat config (`eslint.config.js`) and add `angular-eslint` so templates are actually linted |
| 2.2 | Fix the 22 failing specs — `provideHttpClientTesting`, router and Firebase test providers |
| 2.3 | Replace the `should create` stubs with real assertions on the logic that matters: `calculateAge`, `calculateBMI`, `determineBMIStatus`, `calculatePercentage`, the guards, and `UserService.handleUserLogin` |
| 2.4 | Add a GitHub Actions workflow running `lint`, `test`, `build` for the frontend and `typecheck`, `test` for `backend/` |
| 2.5 | Decide the bundle budget deliberately — either raise it with justification or treat 922 kB as a bug to fix in Phase 6 |

**Exit criteria:** `npm run lint`, `npm test` and `npm run build` all pass locally and in CI.

### Phase 3 — A typed, honest API layer (~2–3 days)

The backend contract is now written down and owned in this repo. Encode it once.

| # | Task |
|---|---|
| 3.1 | Type every service against `src/app/models/` — delete the `any` signatures in `UserService`, `UserDataService`, `ThoughtsService`, and the two repository services |
| 3.2 | Correct the models to match reality: `TrainingRepository` needs `training_name`, `Stretch` needs `stretch_name` and `video_link`, `MoodType` must match the lowercase values `ThoughtsComponent` actually sends |
| 3.3 | Delete the triple response-shape guessing in the three components; the backend returns `{ success, data }` |
| 3.4 | Collapse the duplicate `HttpProgressState`/`HttpState` definitions to one |
| 3.5 | Align request field names with the backend's canonical names (`training_frequency`, `country`, `training_date`, `training_type`, `name`). The backend accepts both spellings today, so **this can land without a backend change** — then the aliases become removable |
| 3.6 | Delete the 4 dead `express` imports, the unused `LogOutComponent`, `.app-container`, and the three redundant `providers: [AuthService]` |

**Exit criteria:** no `any` in `src/app/services/`; `strictTemplates` passes with real types.

### Phase 4 — Close the security gaps (~2–3 days, spans both halves of the repo)

| # | Task |
|---|---|
| 4.1 | **Send the Firebase ID token.** Add an interceptor that attaches `Authorization: Bearer <idToken>`; verify it in the backend with the Firebase Admin SDK and derive `user_id` from the verified token instead of trusting the request body. Resolves `BACKEND_SPEC.md` §9.3 |
| 4.2 | Replace `bypassSecurityTrustResourceUrl` with real validation — parse the URL, require a YouTube host, extract the video ID, and build the embed URL from the ID. Reject anything else |
| 4.3 | Render the recommendation as structured data (or a real Markdown renderer) instead of regex-built HTML; or run it through `SanitizationService` and keep that service, having finally given it a purpose |
| 4.4 | Move the Firebase config to build-time environment substitution |

**Note:** 4.1 is the only item in this plan that requires coordinated frontend + backend
changes. Ship it as one PR across both.

### Phase 5 — Architecture (~4–6 days)

The largest phase, and the most optional. Do it if the app is going to keep growing.

| # | Task |
|---|---|
| 5.1 | Replace the `currentView` string switch with **child routes** under `/home` (`daily`, `trainings`, `stretches`, `thoughts`), lazily loaded. Delivers deep links, a working back button, real code splitting, and deletes the duplicated guard logic from `main-page.component.html` |
| 5.2 | Go fully standalone; drop `AppModule` for `bootstrapApplication` with `provideRouter`/`provideHttpClient` |
| 5.3 | Extract the shared repository behaviour — one generic catalogue component or a shared base service — replacing the copy-paste across training and stretch |
| 5.4 | Move BMI/age/weeks calculations into a `MetricsService` with unit tests, so the frontend and backend agree by construction |
| 5.5 | Adopt `OnPush` + signals for component state; drop the manual `cdr.detectChanges()` calls |
| 5.6 | Add `trackBy` to every `*ngFor` |

### Phase 6 — Make the promised features real (~3–5 days)

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
Phase 1 (bugs)  →  Phase 2 (quality gate)  →  Phase 3 (types)  →  Phase 4 (security)
                                                                        │
                                              Phase 5 (architecture)  ──┤
                                              Phase 6 (features/perf) ──┘
```

Phases 1 and 2 are the ones I would not skip: today the app logs users out on refresh, and
there is no test or lint run that could tell you if that got worse. Phases 5 and 6 are
independent of each other and can be interleaved or dropped.

If time is very limited, **Phase 1.1 alone** (auth persistence) is the highest-value change
in this document — it is the difference between an app you can use and one you cannot.

## 5. Deliberately not proposed

- **Rewriting in another framework.** Nothing here is an Angular problem.
- **SSR.** `@angular/ssr`, `@angular/platform-server` and `express` are dependencies with no
  server target and no `server.ts`. The honest move is to **remove those three dependencies**,
  not to build SSR for an authenticated dashboard that would not benefit.
- **E2E tests.** Not worth the setup until Phases 1–3 have stabilised the surface.
- **Redesign.** The neon/CRT aesthetic is a deliberate choice; Phase 6.1 preserves it while
  making it theme-aware.
