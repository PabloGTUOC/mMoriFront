# Backlog

Everything still outstanding, written so a fresh session can pick any item up cold. Each
entry says **where**, **why it matters**, and **how to know it worked**.

Nothing here blocks a local run — see [`README.md`](README.md) for that, and
[`backend/README.md`](backend/README.md) for the Docker stack. The six-phase audit in
[`FRONTEND_IMPROVEMENT_PLAN.md`](FRONTEND_IMPROVEMENT_PLAN.md) is complete; the design
system now lives in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md).

**Baseline to preserve:** 78 frontend tests, 106 backend tests, 0 lint errors, 0 lint
warnings, 577 kB initial bundle (budget warns at 620).

```bash
npm run lint && npm run test:ci && npm run build     # frontend
cd backend && npm run typecheck && npm test && npm run build
```

---

## 1. Configuration — nobody but the owner can do these

### 1.1 Firebase Admin credentials — *in progress*
`AUTH_MODE` defaults to `required`; without credentials every user-scoped request answers
401. Firebase Console → Project Settings → Service Accounts → Generate new private key, for
project `trainingapp-44fb4`.

Save it as **`backend/secrets/firebase-service-account.json`**. That path is gitignored and
compose mounts the directory read-only at `/run/secrets`; the key is passed as a *file*
rather than inline JSON because it contains newlines and quotes that do not survive shell
and compose interpolation. Then set `AUTH_MODE=required` in `backend/.env`.

*Done when:* `docker compose logs api | grep -i firebase` says `Firebase Admin initialised`,
and signing in loads the dashboard with `AUTH_MODE=required`.

### 1.2 ~~Real life-expectancy data~~ — **done**
226 real entries are loaded and a Spanish male profile returns `base_life_expectancy: 80.5`.
The dataset is `data/life_expectancy.json`, and the seeder's placeholder warning now keys on
the sample `_readme` marker rather than the filename, so it no longer fires on real data.

### 1.3 Production API URL
`src/environments/environment.ts` still has `apiUrl: 'http://localhost:3000'`. Either edit
it or export `API_URL` and run `npm run config:env`.

*Done when:* a production build points somewhere real. (A production build over HTTPS
calling `http://localhost` is also blocked as mixed content.)

### 1.4 `OPENAI_API_KEY` — optional
Only `POST /generate_recommendation` needs it. Without it that endpoint returns 422 and the
Thoughts screen shows the mood but no recommendation; everything else works.

---

## 2. Known defects

### 2.1 Dependabot reports 122 vulnerabilities on `master`
5 critical, 67 high, 43 moderate, 7 low, per the push output. Nothing has been triaged. Most
are likely transitive dev dependencies, but that is an assumption, not a finding.

---

## 3. Code — small, self-contained

### 3.1 Finish `OnPush` on the last three components
Current state, verified:

| Component | Change detection | Async state |
|---|---|---|
| `DisplayDailyComponent` | **OnPush** | 13 signals |
| `InputDailyComponent` | default | `trainings` is a signal; the rest are plain |
| `ThoughtsComponent` | default | plain fields (`selectedMood`, `recommendationBlocks`) |
| `FirstTimeComponent` | default | plain fields (`userId`) |
| `HistoryComponent` | **OnPush** | signals throughout |

Follow the pattern in `DisplayDailyComponent`: move async-updated fields to `signal()`
*first*, add `()` in the template, then add `changeDetection: ChangeDetectionStrategy.OnPush`.
Assigning a plain field under OnPush leaves a completed request invisible on screen, which is
why the signal step comes first.

⚠️ `OnPush` faults are **runtime-only** — unit tests that call `detectChanges()` by hand will
not catch them. Verify in a browser. That is exactly why `InputDailyComponent` got a signal
but not the strategy.

### 3.2 Two stale `TODO` comments
- `src/app/services/error-handler.service.ts:106` — "Integrate with error monitoring service".
  Either wire up Sentry or delete the placeholder. Its unused `_error` parameter is
  underscore-prefixed to keep lint quiet; it is the argument Sentry would take.
- `src/environments/environment.ts:8` — resolved by item 1.3; delete the comment then.

### 3.3 `DESIGN.md` frontmatter is partly stale
The prose sections were updated when the M3 token layer landed, but the frontmatter still
lists some pre-M3 colour values. Re-running `/impeccable document` would regenerate it from
the code, along with `.impeccable/design.json`.

---

## 4. Code — larger

### 4.1 Firebase `compat` → modular SDK — *now more than a tidy-up*
The last piece of plan item 6.6, deliberately skipped as a bundle-size trade. It has since
cost real bugs: the compat layer resolves its promises **outside the Angular zone**, which is
why the dashboard hung on "Loading…" and the training dropdown stayed empty until an
unrelated click. That is patched at both entry points (`enterZone` in `AuthInterceptor`,
`zone.run` in `UserService.initializeSession`), but the patches are guards around a layer
that should not need them.

Seven files import `@angular/fire/compat`. Note the quirks the current code depends on:
`afAuth.authState` is an Observable but `afAuth.currentUser` is a **Promise** — the
interceptor wraps it in `from()`. The modular SDK differs on both.

*Done when:* no `@angular/fire/compat` import remains, the reload-keeps-you-signed-in
behaviour still holds (verify in a browser), the two zone patches can be removed without the
dashboard hanging, and 70 tests still pass.

### 4.2 Audit the screens that were never exercised
Every bug found in the design-system session was the same shape: **code that looked correct,
was never run, and silently did nothing.**

- The weight chart built its SVG in `ngOnInit`, but its `@ViewChild` does not resolve until
  `ngAfterViewInit` — it had never rendered, with data or without.
- The life grid set an inline fill of `'white'` / `'green'` and never applied the classes its
  stylesheet targeted, so every `.dot` rule was dead.
- The nav set `routerLinkActive="active"` against a class no rule defined.
- Colours were set with `attr('fill', 'var(--x)')`, which is invalid — `var()` resolves in a
  CSS property, not an SVG presentation attribute.
- Three labels were coloured with a *surface* token, landing at 1.06:1 on the light theme.

`ThoughtsComponent`, both catalogue views and `FirstTimeComponent` have not had that pass.
Assume the same class of defect until checked.

### 4.3 Catalogue behaviour is not directly tested
`CatalogueComponent` owns the fetch / toggle / submit / refetch cycle for both catalogues, but
its subclasses only have creation smoke tests. A spec for `load()` and `submit()` on the base
class would cover both views at once. Cheap, and it guards a shared code path — see 4.2.

### 4.4 Rate limiter state is in-memory
`backend/src/middleware/rate-limit.ts` is correct for one instance and wrong for several —
each replica would enforce its own quota. Move to Redis **only if** the API is ever scaled
out. Documented in the file itself.

---

## 5. Verification debt

**No UI work from the design-system session was ever seen in a browser.** The Chrome
extension would not connect, so the M3 token layer, the navigation rebuild, the stat tiles,
the life-chart dialog, the weight chart rendering for the first time, and every dot colour
rest on unit tests, contrast arithmetic and code reading — not on looking at them.

Contrast was computed for every state that changed, in both themes, and all pairs pass. That
is not the same as the layout being right.

Treat the first day of real use as a bug hunt.

---

## 6. Decisions to revisit, not bugs

Recorded so nobody "fixes" them by accident.

| Decision | Why | Where |
|---|---|---|
| M3 *architecture*, not Angular Material | The token structure is M3's; the library is not. Adding it costs back the ~355 kB its removal saved and returns the look PRODUCT.md names as an anti-reference | `src/styles/themes.scss` |
| `--glow` resolves to `transparent` | Glow was being spent on headings, labels and buttons alike, which made it read as texture. It survives only on the header and life chart, which reference `--accent-bright` directly | `themes.scss`, DESIGN.md §4 |
| `--button-gradient` resolves to the *tonal* fill, not primary | Those components pair the fill with `--panel-text`; near-white on the raw seed is 2.94:1, the tonal container 8.71:1 | `themes.scss` |
| Stat values are plain ink, not accent | Six pink numbers spent the whole One Voice budget on the stat grid; the accent is reserved for weeks-left | `display-daily.component.css` |
| The life-chart dialog has no close button | Requested. Dismissal is the backdrop or Escape; `tabindex="-1"` on the panel is what the focus trap captures with no focusable child | `display-daily.component.html` |
| `:host ::ng-deep` on the life grid | D3 creates the circles at runtime, so they never receive the `_ngcontent` attribute emulated encapsulation rewrites every selector to require | `life-expectancy-chart.component.scss` |
| Response envelopes are inconsistent (`error` vs `message`, 200-not-404, `POST /stretches` returns 200) | Reproduced from the spec on purpose; clients branch on the exact shape | `backend/README.md` §Response conventions |
| BMI band gaps **fixed**, diverging from the spec | The original ranges left holes where a BMI got the underweight penalty | `life-methods.service.ts` |
| Header and life chart stay dark in both themes | The neon glow only reads on a dark backdrop; they are the app's signature | `src/styles/themes.scss` |
| `created_by` is stored but never returned | Provenance is for whoever operates the service; returning other users' uids would be its own small leak | `backend/src/models/*-repository.model.ts` |
| A failed profile lookup resolves to `isNew: false` | Treating an unreachable API as "new user" would re-onboard an existing one and write a duplicate profile | `user.service.ts`, asserted in its spec |
| Backend still accepts `user_id` from a caller | Keeps the API usable by other clients; `requireAuth` overwrites it with the verified uid and 403s on a mismatch | `require-auth.ts` |
| Dates are stamped from the **local** calendar, not UTC | `toISOString()` filed anything logged before the UTC offset against yesterday — 00:30 in Spain became the previous day | `src/app/shared/dates.ts` |
| `training_count` is distinct days, `total_days_since_joining` includes the join day | Both diverge from BACKEND_SPEC. The first made two sessions in a day read as two days trained; the second made day-one training report 0% | `trainings.controller.ts`, backend README §3b–3c |
| A same-day weigh-in replaces rather than appends | The spec appends and disambiguates on read. That left two points at one x on the chart and no way to fix a typo, since the API has no PATCH or DELETE | `weight-updates.controller.ts`, backend README §3d |
| Deletes are scoped by a filter, not a check | `user_id` is part of the query, so no future caller can reach the delete without it. Another user's row answers 404 exactly as a missing one does | `lib/owned.ts`, `backend/README.md` §3e |
| Moods are read-only in the UI | A mood records how a day felt; editing it later makes the series a record of how you remember it | `history.component.html` |
| Deleting takes two clicks | There is no undo, and removing a training moves the dashboard's "days trained" | `history.component.ts` |
| `README_ENHANCEMENTS.md` still exists | Kept as the record of what was claimed versus what was true — that gap is why the audit happened | — |
