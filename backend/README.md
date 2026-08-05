# mMori Backend (Node)

Node/TypeScript reimplementation of **MoriBackEnd**, the API behind the mMori Angular
frontend in this repository. It replaces the Rails 7.1 + Mongoid service specified in
[`../BACKEND_SPEC.md`](../BACKEND_SPEC.md), which lives in a separate repo.

Same 16 routes, same paths, same response envelopes, same MongoDB collections — so the
existing frontend works against it with no changes to `environment.ts`.

---

## Quick start

```bash
cd backend
cp .env.example .env          # fill in OPENAI_API_KEY if you want mood recommendations
npm install

# Need a MongoDB. Either point MONGODB_URI at one you already have, or:
docker run -d --name mmori-mongo -p 27017:27017 mongo:7

npm run seed:life-expectancy  # REQUIRED — see "Reference data" below
npm run dev                   # http://localhost:3000
```

Then start the frontend from the repo root (`npm start`) and open `http://localhost:4200`.
`src/environments/environment.ts` already points at `http://localhost:3000`.

Or run both services together:

```bash
docker compose up --build
docker compose run --rm api npm run seed:life-expectancy
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the test suite |
| `npm run seed:life-expectancy` | Load the `life_expectancy` reference collection |

## Configuration

Everything is environment-driven; see [`.env.example`](.env.example) for the full list. The
ones that matter: `MONGODB_URI`, `CORS_ORIGINS`, `OPENAI_API_KEY`, `PORT`.

`CHATGPT_API_KEY` is accepted as an alias for `OPENAI_API_KEY` — that was the Rails name.

---

## Reference data — read this before you file a bug

The life-expectancy figures come from a `life_expectancy` collection that **is not created
by the application**. Without it, `fetchBaseLifeExpectancy` returns `0` for every user and
the dashboard shows a nonsense "weeks left to live" — with no error anywhere, because a
base of zero is indistinguishable from a real answer (BACKEND_SPEC §3.7 and §5.1).

The Rails repo shipped no seeding code at all. This one does:

```bash
npm run seed:life-expectancy                     # bundled sample data
npm run seed:life-expectancy -- ./real-data.json # your dataset
npm run seed:life-expectancy -- ./real-data.csv
```

Expected document shape (note the capitalised field names — the lookup queries them
literally):

```json
{ "Country_Code": "ESP", "Gender": "Male", "Type": "LifeExpectancy_Gen", "Years": 83.2 }
```

⚠️ **`data/life_expectancy.sample.json` is placeholder data**, not a real dataset. It
covers six countries with round illustrative numbers so the seeding path and the adjustment
algorithm can be exercised end to end. Replace it with a real source — e.g. WHO Global
Health Observatory life expectancy at birth, or World Bank `SP.DYN.LE00.MA.IN` /
`SP.DYN.LE00.FE.IN` — before treating any number this API returns as meaningful. The
frontend offers ~180 countries; the sample covers six, so most users would get a base of 0.

Re-running the seeder is safe: rows upsert on `(Country_Code, Gender, Type)`.

---

## Architecture

```
src/
  server.ts                  process entrypoint: connect to Mongo, then listen
  app.ts                     Express app factory (CORS, JSON, routes, error handler)
  routes.ts                  all 16 routes at their exact spec paths
  config/env.ts              environment configuration
  db/mongo.ts                connection management + raw collection access
  models/                    six Mongoose models mirroring the Mongoid collections
  controllers/               one per Rails controller
  services/
    life-methods.service.ts  the life-expectancy algorithm (BACKEND_SPEC §5)
    openai.service.ts        Chat Completions call for mood recommendations
  lib/
    params.ts                strong-parameter wrappers, field aliases, coercion
    serialize.ts             Mongoid-compatible JSON ($oid, date formats)
    http.ts                  response envelope helpers
    logger.ts                level-aware logger
  scripts/                   seeding
tests/                       unit + integration suites
```

Stack: Express 5, Mongoose 9, TypeScript (ESM), Vitest. No authentication — see
"Security" below.

### Data model

Six collections, unchanged from the spec: `user_data`, `trainings`, `weight_updates`,
`moods`, `training_repository`, `stretch_repository`, plus the `life_expectancy` reference
collection.

Two things about `user_data` are easy to miss and are preserved deliberately:

- It is an **append-only history**, not one row per user. Signing up again adds a document.
- Reads take the **newest** snapshot — except `training-stats`, which takes the **oldest**
  as the user's join date.

### Response conventions

Reproduced exactly from §6, including the parts that are inconsistent, because clients
branch on them:

- Every response carries `success: true|false`.
- Failure messages land under `error` on some endpoints and `message` on others.
- "Not found" is a **200 with `success: false`** everywhere except `training-stats`, which
  is the only real 404.
- `POST /stretches` returns **200**, not 201 like the other creates.
- `_id` and `inserted_id` serialise as `{ "$oid": "..." }`, not bare strings.

Don't "clean these up" without changing the frontend in the same commit.

---

## Deviations from BACKEND_SPEC

Every difference is deliberate and listed here. Nothing else changed.

### 1. Field aliases, so the current frontend actually works

The spec and the Angular app **disagree about field names on four endpoints**. Against the
Rails backend as specified, those requests are dropped by strong parameters or rejected
outright. Each endpoint now accepts both spellings; the spec's name wins when both are
present, and storage always uses the spec's field name.

| Endpoint | Spec expects | Frontend sends | Consequence before |
|---|---|---|---|
| `POST /user_data` | `training_frequency`, `smoking_status`, `drinking_status`, `country` | `trainingFrequency`, `smoker`, `drinker`, `country_code` | All four dropped → 422 on presence validations → **signup could not complete** |
| `POST /trainings` | `training_date`, `training_type` | `date`, `training` | Both dropped → row saved with nulls (no validations), so the session was counted but its type and date were lost |
| `POST /training-repository` | `name` | `training_name` | Catalogue entries saved with no name; the list rendered blank titles |
| `POST /stretches` | `stretch` wrapper, `name` | no wrapper, `stretch_name`, `video_link` | **400 on the missing wrapper** — adding a stretch failed outright |

On the read side, `GET /training-repository` and `GET /stretches` now also emit
`training_name` / `stretch_name` mirroring `name`, because `TrainingItemComponent`,
`StretchItemComponent` and the daily training picker read those keys.

### 2. `video_link` added to the stretch catalogue

`StretchItemComponent` embeds a YouTube player from `stretch.video_link`, and the
add-stretch form requires a URL — but the spec's model has no such field, so the link was
dropped on write and the iframe rendered empty. The field is additive; nothing else about
the contract changes.

### 3. BMI band gaps fixed

§5.5 used inclusive ranges (`19..24.99`, `25..27.49`, `27.5..29.99`, …) with gaps between
them. A BMI of 24.995 matched no band and fell through to the `else`, collecting the
**underweight** penalty of −2 instead of 0. Same for 27.495, 29.995, 34.995, 39.995.

This implementation uses half-open ranges and handles `BMI < 19` explicitly, which is what
§5.5 itself recommends. Every band's intended penalty is unchanged. `tests/life-methods.test.ts`
pins down both the bands and the former gap values.

### 4. `POST /moods` returns 400 instead of crashing

§4.14 notes that omitting the `mood_data` key raised `NoMethodError` → **500**. That is a
crash, not a contract, so a missing wrapper now falls through to the documented 400
"Missing parameters".

### 5. Missing `user_id` matches nothing instead of anything

§4.2 and §4.13 have no `user_id` presence check. In Rails, `where(user_id: nil)` harmlessly
matched nothing. A naive port would pass `undefined` to Mongoose, which **strips the filter
and returns another user's document**. Missing IDs are coalesced to `null`, preserving the
spec's behaviour without the data leak. Covered by tests.

### 6. Operational hardening (§9 asked for all of these)

- **PostgreSQL/ActiveRecord dropped entirely.** §9 documents it as vestigial — no
  controller, model or service ever touched it — and its `database.yml` carried plaintext
  credentials. There is no trace of it here, and no `db:prepare` step in the Dockerfile.
- **Mongo configured for every environment** from `MONGODB_URI` (§9.1).
- **CORS origins from `CORS_ORIGINS`** instead of a hardcoded localhost (§9.2).
- **OpenAI call has a timeout and catches network errors** (§9.6). Both failure modes
  return the documented 422 rather than a 500.
- **Full OpenAI response body no longer logged** (§9.5) — only finish reason and token
  count. The body contains user-derived content.
- **`puts` debug output replaced** with a level-aware logger, off by default (§9.4).
- **Central error handling** — `ApplicationController` had none (§7). Unhandled errors are
  JSON 500s, missing wrappers are 400s, malformed JSON is a 400.

### 7. Not changed: authentication

There still isn't any. §9.3 is right that any caller can read or write any user's data by
guessing a `user_id`, which is a client-supplied string trusted verbatim. Changing that means
touching both halves of the app, so it was out of scope for a port that had to stay
wire-compatible.

It is designed, though: **[`../FRONTEND_IMPROVEMENT_PLAN.md`](../FRONTEND_IMPROVEMENT_PLAN.md)
§Phase 4** specifies the end-to-end fix — a `requireAuth` middleware built on `firebase-admin`
that verifies the ID token the frontend already holds, `user_id` derived from the verified
`uid` instead of the request body, the per-route policy, a staged `AUTH_MODE=optional →
required` rollout that avoids breaking the live client, and the test coverage it needs.
Existing documents already store the Firebase `uid` in `user_id`, so no data migration is
involved.

**Until that ships, do not expose this service beyond localhost.**

---

## Testing

```bash
npm test
```

Four suites, 72 tests:

| Suite | Needs a database? |
|---|---|
| `tests/life-methods.test.ts` | no — the §5 algorithm, band by band |
| `tests/serialize.test.ts` | no — `$oid` and date wire formats, parameter coercion |
| `tests/api-guards.test.ts` | no — routing, wrapper requirements, `UserId is missing` guards |
| `tests/api.test.ts` | **yes** — all 16 endpoints end to end |

The integration suite resolves a database in this order: `TEST_MONGODB_URI` / `MONGODB_URI`
if reachable → an ephemeral in-memory MongoDB → **skipped with a printed warning**. So
`npm test` gives full coverage on a normal dev machine and still runs the 41 DB-free tests
in a sandbox that can neither reach a Mongo nor download the mongod binary.

If you see `41 passed | 31 skipped`, the integration suite skipped — start a MongoDB and
re-run to execute it.

The OpenAI call is stubbed in tests; nothing here reaches the network.

## API reference

See [`../BACKEND_SPEC.md`](../BACKEND_SPEC.md) §4 for the full request/response detail. The
route table, verbatim:

| Method | Path | Purpose |
|---|---|---|
| GET | `/up` | Health check (also reports Mongo connectivity) |
| POST | `/user_data` | Create a profile snapshot |
| GET | `/user_data/user_data` | Profile + base/adjusted life expectancy |
| POST | `/trainings` | Log a training session |
| GET | `/trainings/latest-trainings` | Most recent session |
| GET | `/trainings/initial-trainings` | Oldest session |
| GET | `/trainings/all-trainings` | All sessions |
| GET | `/trainings/training-stats` | Session count vs. days since joining |
| GET | `/training-repository` | Training catalogue |
| POST | `/training-repository` | Add a catalogue entry |
| POST | `/weight_updates` | Record a weigh-in |
| GET | `/weight_updates/latest_weight` | Latest weigh-in |
| GET | `/stretches` | Stretch catalogue |
| POST | `/stretches` | Add a stretch |
| POST | `/moods` | Save a daily mood |
| POST | `/generate_recommendation` | AI wellbeing recommendation |

The awkward paths (`/user_data/user_data`, hyphenated `/trainings/*` beside underscored
`/weight_updates/latest_weight`) are artifacts of the original Rails routing. The Angular
services call these literal strings — renaming any of them breaks the app.
