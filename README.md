# mMori

A *memento mori* dashboard wrapped around a fitness and mood tracker. It renders your life
as a grid of 52-dots-per-row weeks — lived versus remaining, against a life expectancy
adjusted for your lifestyle — alongside training, weight and mood logging.

Angular 18 frontend in `src/`, Node/Express/MongoDB API in [`backend/`](backend).

---

## Running it

You need **three** things: MongoDB, Firebase Admin credentials, and reference data. The
second and third are not optional — see the warnings below.

```bash
# 1. API
cd backend
cp .env.example .env          # then fill in the values flagged below
npm install
docker run -d -p 27017:27017 mongo:7      # or point MONGODB_URI at your own
npm run seed:life-expectancy              # REQUIRED
npm run dev                               # http://localhost:3000

# 2. Frontend
cd .. && npm install && npm start          # http://localhost:4200
```

> ⚠️ **Pick an auth mode before first run.** The frontend sends no user identity of its own —
> the API derives it from the verified ID token — so `AUTH_MODE` defaults to `required` and
> every user-scoped request answers 401 without `FIREBASE_SERVICE_ACCOUNT_JSON`.
>
> To run locally **without Firebase at all**, set `AUTH_MODE=disabled` in `backend/.env`:
> every request is then treated as one shared local account (`DEV_USER_ID`). Google Sign-In
> still needs the web Firebase config, which is already committed in `environment.ts`.

> ⚠️ **The bundled life-expectancy data is placeholder data** — six countries of round
> illustrative numbers. Until you seed a real dataset, most users get a base of 0 and a
> meaningless "weeks left". See [`backend/README.md`](backend/README.md#reference-data).

> ⚠️ **`environment.ts` still points at `http://localhost:3000`.** Set a real API URL before
> a production build, either by editing the file or with `npm run config:env`.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Dev server on :4200 |
| `npm run build` | Production build |
| `npm test` / `npm run test:ci` | Unit tests (Karma + Jasmine; `test:ci` runs headless) |
| `npm run lint` / `lint:fix` | ESLint, flat config, with Angular template rules |
| `npm run format` / `format:check` | Prettier |
| `npm run config:env` | Regenerate `environment.ts` from `FIREBASE_*` / `API_URL` |

## Stack

Angular 18 (standalone, no NgModules), TypeScript, RxJS, signals. D3 imported per module for
the two charts. Firebase Authentication (Google Sign-In) via `@angular/fire` compat. Angular
CDK for the dialog focus trap. PWA via `@angular/service-worker`.

No CSS framework: Bootstrap was declared but never imported and has been removed, and Angular
Material was dropped when its only two controls became native `<select>`s.

## Architecture

```
src/
  main.ts                  bootstrapApplication(AppComponent, appConfig)
  app/
    app.config.ts          all providers — router, http, interceptors, APP_INITIALIZER
    app.routes.ts          lazily-loaded child routes under /home
    guards/                auth + new-user, both waiting on a resolved session
    interceptor/           auth (token) and http (spinner, timeout, retry)
    services/              user/session, metrics, catalogues, notifications, theme
    shared/                catalogue base component, YouTube + recommendation parsing
    models/                the API contract as types
  environments/            environment.ts, replaced by .development.ts for dev builds
  testing/                 shared TestBed providers
```

Session state is a single `Session` in `UserService`, driven by Firebase `authState` and
resolved by an `APP_INITIALIZER` before the router evaluates a guard — which is what makes a
page reload keep you signed in.

## Testing and CI

61 frontend tests (Karma/Jasmine) and 61 backend tests (Vitest). GitHub Actions runs lint,
test and build for the frontend, and typecheck, test and build for the backend against a
MongoDB service container, so the backend's integration suite executes rather than skipping.

## Documentation

| Document | What it is |
|---|---|
| [`backend/README.md`](backend/README.md) | API setup, configuration, and every deliberate deviation from the spec |
| [`BACKEND_SPEC.md`](BACKEND_SPEC.md) | Specification of the original **Rails** service this API replaced |
| [`FRONTEND_IMPROVEMENT_PLAN.md`](FRONTEND_IMPROVEMENT_PLAN.md) | The audit that produced the current state, and the record of what was done |
