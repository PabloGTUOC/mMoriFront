# MoriBackEnd — Complete Functionality Specification

> **This describes the original Rails service, which lives in a separate repository.** It is
> kept as the authoritative record of the contract that was reimplemented. The running API is
> now the Node service in [`backend/`](backend); where it deliberately differs — added
> endpoints, fixed BMI bands, authentication — those differences are listed in
> [`backend/README.md`](backend/README.md). Read this for *what the contract is*, and that
> for *what the implementation does*.

> **Purpose of this document.** This is a reconstruction-grade specification of the
> `MoriBackEnd` service. It describes every route, model, field, validation, business
> rule, external integration, and configuration detail needed to rebuild the backend
> from scratch in a parallel repository — in Rails or in any other stack.
>
> Everything below is derived from the current source. Where the current
> implementation has quirks, gaps, or bugs, they are documented under
> **"Quirks & known issues"** rather than silently corrected, so a reimplementation can
> decide deliberately whether to preserve or fix each one. Sections marked
> ⚠️ describe behaviour that clients may already depend on.

---

## 1. System overview

MoriBackEnd is a **JSON-only, stateless HTTP API** for a health / longevity tracking
application ("Memento Mori"). Its consumer is an Angular frontend (`MoriFront`) running
at `http://localhost:4200`.

The app does five things:

1. **Stores user profile data** (DOB, gender, height, weight, lifestyle, country).
2. **Computes a life expectancy estimate** — a country/gender baseline pulled from a
   reference dataset, then adjusted by smoking, drinking, BMI, and training frequency.
3. **Records training sessions** and serves aggregate statistics, plus a shared
   catalogue ("repository") of training types and stretches.
4. **Tracks weight over time.**
5. **Records daily mood** and generates a personalised wellbeing recommendation by
   calling the OpenAI Chat Completions API.

### Key architectural facts

| Aspect | Reality |
|---|---|
| Framework | Rails 7.1 in **API-only mode** (`config.api_only = true`) |
| Ruby | 3.3.2 (`.ruby-version`); Gemfile pins `ruby "3.3.2"` |
| Primary datastore | **MongoDB via Mongoid 8** — this is where *all* application data lives |
| Secondary datastore | PostgreSQL via ActiveRecord — **configured but effectively unused** (see §9) |
| Authentication | **None.** There is no auth, no session, no token, no authorization check anywhere |
| User identity | A client-supplied `user_id` **string**, trusted verbatim on every request |
| Views / templates | None (API-only); every response is `render json:` |
| Background jobs | None defined (`ApplicationJob` exists but is unused) |
| WebSockets | ActionCable is wired up but **no channels exist** |
| Mailers | `ApplicationMailer` exists but **nothing sends mail** |

---

## 2. Runtime & dependency stack

### Gems (from `Gemfile`)

```ruby
ruby "3.3.2"

gem "rails",   "~> 7.1.3", ">= 7.1.3.4"
gem "pg",      "~> 1.2"      # ActiveRecord adapter (see §9 — near-vestigial)
gem "puma",    ">= 5.0"
gem "mongoid", "~> 8.0"      # the real datastore
gem "tzinfo-data", platforms: %i[windows jruby]
gem "bootsnap", require: false
gem "rack-cors"

group :development, :test do
  gem "debug", platforms: %i[mri windows]
  gem "dotenv-rails"
end
```

`config/application.rb` does `require "rails/all"`, so the full Rails stack
(ActiveRecord, ActiveStorage, ActionMailer, ActionCable, ActionMailbox, ActionText)
is loaded even though most of it is unused.

### Environment variables

| Variable | Used by | Required? | Notes |
|---|---|---|---|
| `CHATGPT_API_KEY` | `MoodsController#query_chatgpt` | **Yes**, for `POST /generate_recommendation` | OpenAI API key. Loaded via `dotenv-rails` in dev/test |
| `PORT` | Puma | No | Defaults to `3000` |
| `RAILS_ENV` | Rails/Puma | No | Defaults to `development` |
| `RAILS_MAX_THREADS` / `RAILS_MIN_THREADS` | Puma | No | Default `5` |
| `WEB_CONCURRENCY` | Puma | No | Production only; defaults to physical processor count |
| `PIDFILE` | Puma | No | Defaults to `tmp/pids/server.pid` |
| `RAILS_LOG_LEVEL` | Production logger | No | Defaults to `info` |
| `TRAININGAPP_DATABASE_PASSWORD` | `config/database.yml` (production) | No | Postgres, unused in practice |
| `REDIS_URL` | `config/cable.yml` (production) | No | ActionCable, unused |

### Server & container

- **Puma** (`config/puma.rb`): threads `RAILS_MIN_THREADS`..`RAILS_MAX_THREADS` (5/5 default),
  port `PORT` (3000), `worker_timeout 3600` in development, clustered workers in production.
- **Dockerfile**: multi-stage build on `ruby:3.3.2-slim`, `RAILS_ENV=production`,
  `BUNDLE_WITHOUT=development`, non-root `rails` user, exposes `3000`,
  `CMD ["./bin/rails", "server"]`.
- **`bin/docker-entrypoint`**: runs `./bin/rails db:prepare` before `rails server`.
  ⚠️ This targets **PostgreSQL**, not Mongo — see §9.

### CORS (`config/initializers/cors.rb`)

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:4200'
    resource '*',
             headers: :any,
             methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
```

⚠️ Only `http://localhost:4200` is allowed. Any deployed frontend origin must be added
here or requests will be blocked by the browser.

---

## 3. Data model (MongoDB / Mongoid)

Database name: **`trainingappDB`**, host `localhost:27017` (development *and* test).
There is **no `production:` block in `config/mongoid.yml`** — booting in production will
fail to configure Mongoid (see §9).

### 3.1 `UserData` — collection `user_data`

Defined in `app/models/concerns/user_data.rb` (⚠️ unusual location — `app/models/concerns`
is an autoload root, so the class resolves as top-level `UserData`, not a mixin).

| Field | Type | Default | Validation |
|---|---|---|---|
| `user_id` | String | — | presence |
| `dob` | Date | — | presence |
| `gender` | String | — | presence |
| `height` | Integer (cm) | — | presence |
| `weight` | Integer (kg) | — | presence |
| `training_frequency` | Integer (sessions/week) | — | presence |
| `smoking_status` | Boolean | `false` | none |
| `drinking_status` | Boolean | `false` | none |
| `country` | String (country code) | — | presence |
| `created_at` / `updated_at` | Time | — | via `Mongoid::Timestamps` |

Index: `{ user_id: 1, date: 1 }`, non-unique, background.
⚠️ The index references a `date` field that **does not exist** on this model.

**Semantics:** `UserData` is an **append-only history**, not a single profile record.
Multiple documents may share a `user_id`. Reads take `.order_by(created_at: :desc).first`
(the newest) — except `training_stats`, which takes the **oldest** as the user's
"first login" date.

### 3.2 `Training` — collection `trainings`

| Field | Type | Notes |
|---|---|---|
| `user_id` | String | |
| `training_date` | **String** | ⚠️ stored as a string, not a Date — see quirks |
| `training_type` | String | |
| `duration` | Integer (minutes) | |
| `calories_burned` | Integer | |
| `description` | String | |
| `created_at` / `updated_at` | Time | `Mongoid::Timestamps` |

Index: `{ user_id: 1, training_date: 1 }`, non-unique, background.
**No validations** — a `Training` with all-nil fields will save successfully.

### 3.3 `WeightUpdate` — collection `weight_updates`

| Field | Type | Validation |
|---|---|---|
| `user_id` | String | presence |
| `weight` | Float | presence |
| `date` | Date | presence |

Index: `{ user_id: 1, date: 1 }`, non-unique, background.
**No timestamps** on this model.

### 3.4 `Mood` — collection `moods`

| Field | Type |
|---|---|
| `user_id` | String |
| `mood` | String |
| `date` | Date |
| `created_at` / `updated_at` | Time (`Mongoid::Timestamps`) |

**No validations** at the model level; presence is checked in the controller instead.

### 3.5 `TrainingRepository` — collection `training_repository`

Explicit collection name via `store_in collection: "training_repository"`.
A **global catalogue** of training templates — not scoped to any user.

| Field | Type |
|---|---|
| `name` | String |
| `type` | String |
| `duration` | Integer |
| `calories` | Integer |
| `description` | String |
| `created_at` / `updated_at` | Time |

⚠️ `type` is a reserved-ish attribute name in Rails/Mongoid contexts (single-table
inheritance conventions). It works here because Mongoid's inheritance discriminator is
`_type`, not `type`, but a reimplementation on a different ORM should verify this.

### 3.6 `StretchRepository` — collection `stretch_repository`

Global catalogue of stretches. Same shape minus calories.

| Field | Type |
|---|---|
| `name` | String |
| `type` | String |
| `duration` | Integer |
| `description` | String |
| `created_at` / `updated_at` | Time |

### 3.7 `life_expectancy` — raw collection, no model class

Read directly through the Mongo driver in `LifeMethodsService.fetch_base_life_expectancy`:

```ruby
Mongoid.default_client[:life_expectancy].find(
  "Country_Code": country_code,
  "Gender":       gender,
  "Type":         "LifeExpectancy_Gen"
).first
```

Document shape (note the **capitalised, non-Rails field names**):

| Field | Type | Example |
|---|---|---|
| `Country_Code` | String | `"ESP"` |
| `Gender` | String, capitalised | `"Male"` / `"Female"` |
| `Type` | String | `"LifeExpectancy_Gen"` |
| `Years` | Number | `83.2` |

This collection is **reference data** that must be seeded externally — there is no seeding
code in the repo (`db/seeds.rb` is the untouched Rails default). **A reconstruction must
provision this dataset**, or every life-expectancy calculation returns a base of `0`.

---

## 4. HTTP API reference

All responses are JSON. Every endpoint follows a `{ "success": true|false, ... }`
envelope convention, though status codes are applied inconsistently (see quirks).

### Route table (`config/routes.rb`)

| Method | Path | Controller#action |
|---|---|---|
| GET | `/up` | `rails/health#show` (Rails built-in) |
| POST | `/user_data` | `user_data#create` |
| GET | `/user_data/user_data` | `user_data#user_data` |
| POST | `/trainings` | `trainings#create` |
| GET | `/trainings/latest-trainings` | `trainings#latest_trainings` |
| GET | `/trainings/initial-trainings` | `trainings#initial_trainings` |
| GET | `/trainings/all-trainings` | `trainings#all_trainings` |
| GET | `/trainings/training-stats` | `trainings#training_stats` |
| GET | `/training-repository` | `trainings#training_repository` |
| POST | `/training-repository` | `trainings#create_training_repository` |
| POST | `/weight_updates` | `weight_updates#create` |
| GET | `/weight_updates/latest_weight` | `weight_updates#latest_weight` |
| GET | `/stretches` | `stretches#index` |
| POST | `/stretches` | `stretches#create` |
| POST | `/moods` | `moods#save_mood` |
| POST | `/generate_recommendation` | `moods#generate_recommendation` |

⚠️ The nested collection paths are awkward artifacts of `resources ... do collection do`.
`/user_data/user_data` is the real path for reading user data — **not** `/user_data`.
Preserve these exact paths unless the frontend is updated in lockstep.

---

### 4.1 `POST /user_data` — create a user profile snapshot

**Request body** (params must be nested under `user_data`):

```json
{
  "user_data": {
    "user_id": "abc123",
    "dob": "1990-05-14",
    "gender": "Male",
    "height": 180,
    "weight": 78,
    "training_frequency": 3,
    "smoking_status": false,
    "drinking_status": true,
    "country": "ESP"
  }
}
```

Permitted keys: `user_id, dob, gender, height, weight, training_frequency,
smoking_status, drinking_status, country`.

**201 Created**
```json
{ "success": true, "inserted_id": { "$oid": "665f..." } }
```

**422 Unprocessable Entity**
```json
{ "success": false, "errors": ["User can't be blank", "Dob can't be blank"] }
```
Failures are also written to `Rails.logger.error`.

---

### 4.2 `GET /user_data/user_data?user_id=<id>` — profile + life expectancy

The most important read endpoint. Pipeline:

1. Load the **most recent** `UserData` for `user_id` (`order_by(created_at: :desc).first`).
2. `base_life_expectancy = LifeMethodsService.fetch_base_life_expectancy(user_data)`
3. `latest_weight = LifeMethodsService.fetch_latest_weight(user_id)` (may be `nil`)
4. `adjusted = LifeMethodsService.adjust_life_expectancy(base, user_data, latest_weight)`

**200 OK (found)**
```json
{
  "success": true,
  "user_data": {
    "_id": { "$oid": "665f..." },
    "user_id": "abc123",
    "dob": "1990-05-14",
    "gender": "Male",
    "height": 180,
    "weight": 78,
    "training_frequency": 3,
    "smoking_status": false,
    "drinking_status": true,
    "country": "ESP",
    "created_at": "2024-06-14T12:02:57.000Z",
    "updated_at": "2024-06-14T12:02:57.000Z"
  },
  "base_life_expectancy": 83.2,
  "adjusted_life_expectancy": 85.2
}
```

**200 OK (not found)** — ⚠️ still `200`, not `404`:
```json
{ "success": false, "message": "No data found" }
```

⚠️ **No `user_id` presence check.** Omitting `user_id` runs `UserData.where(user_id: nil)`,
which almost always returns nothing and yields the "No data found" branch.

---

### 4.3 `POST /trainings` — log a training session

**Request body** (nested under `training`):

```json
{
  "training": {
    "user_id": "abc123",
    "training_date": "2024-06-14",
    "training_type": "Running",
    "duration": 45,
    "calories_burned": 400,
    "description": "Morning run"
  }
}
```

**201 Created** → `{ "success": true, "inserted_id": { "$oid": "..." } }`
**422** → `{ "success": false, "errors": [...] }`

⚠️ `Training` has no validations, so the 422 branch is effectively unreachable — any
well-formed request succeeds, including one with all fields null.

---

### 4.4 `GET /trainings/latest-trainings?user_id=<id>`

Returns the **single most recent** training: `order_by(training_date: :desc).first`.

**200 OK** → `{ "success": true, "training": { ...training document... } }`
**200 OK (none)** → `{ "success": false, "error": "No training data found" }`
**400 Bad Request** (missing/blank `user_id`) → `{ "success": false, "error": "UserId is missing" }`

Note the singular key `training` — this returns one object, not an array.

### 4.5 `GET /trainings/initial-trainings?user_id=<id>`

Identical to 4.4 but ascending: the **oldest** training. Same response shape,
same `training` key.

### 4.6 `GET /trainings/all-trainings?user_id=<id>`

All trainings for the user, `order(training_date: :asc)`.

**200 OK** → `{ "success": true, "trainings": [ ...array... ] }`
**200 OK (none)** → `{ "success": false, "message": "No data found" }` — note the key is
`message` here, whereas 4.4/4.5 use `error`.
**400** → `{ "success": false, "error": "UserId is missing" }`

⚠️ Uses `puts` for debug output (`"Received user_id: ..."`, `"Retrieved trainings: ..."`),
which writes to stdout and bypasses the Rails logger.

### 4.7 `GET /trainings/training-stats?user_id=<id>`

Compares the user's earliest `UserData` record ("first login") against their training count.

1. `first_login = UserData.where(user_id:).order_by(:created_at.asc).first`
2. `first_login_date = first_login.created_at.to_date`
3. `training_count = Training.where(user_id:).count`
4. `total_days_since_joining = (Date.today - first_login_date).to_i`

**200 OK**
```json
{
  "success": true,
  "training_count": 42,
  "total_days_since_joining": 130,
  "first_login_date": "2024-06-14"
}
```

**400** (blank `user_id`) → `{ "success": false, "error": "UserId is missing" }`
**404** (no `UserData`) → `{ "success": false, "error": "No user data found" }`

This is the only endpoint that returns a genuine `404`.

---

### 4.8 `GET /training-repository` — global training catalogue

Returns **all** `TrainingRepository` documents. Not user-scoped, no parameters.

**200 OK** → `{ "success": true, "data": [ ... ] }`
**200 OK (empty)** → `{ "success": false, "message": "No training repository data found" }`

### 4.9 `POST /training-repository` — add a catalogue entry

⚠️ **The request body must be nested under `training`**, not `training_repository`
(`params.require(:training).permit(:name, :type, :duration, :calories, :description)`).

```json
{
  "training": {
    "name": "HIIT",
    "type": "Cardio",
    "duration": 30,
    "calories": 350,
    "description": "High intensity intervals"
  }
}
```

**201 Created** → `{ "success": true, "data": [ { ...the created doc... } ] }`
(note: a **single-element array**, for frontend symmetry with the index response)
**422** → `{ "success": false, "errors": [...] }` (unreachable — no validations)

---

### 4.10 `GET /stretches` — global stretch catalogue

**200 OK** → `{ "success": true, "data": [ ... ] }`
Always `success: true`, even when the collection is empty (`data: []`).

### 4.11 `POST /stretches`

Body nested under `stretch`; permitted keys `name, type, duration, description`.

```json
{ "stretch": { "name": "Hamstring", "type": "Static", "duration": 60, "description": "Hold 60s" } }
```

**200 OK** → `{ "success": true, "data": [ { ... } ] }`
⚠️ Returns `200`, not `201` — inconsistent with the other create endpoints.
**200 OK (failure)** → `{ "success": false, "errors": [...] }` — ⚠️ no status code set,
so a failure also returns `200`.

---

### 4.12 `POST /weight_updates` — record a weigh-in

Body nested under `weight_update`; permitted keys `user_id, date, weight`.

```json
{ "weight_update": { "user_id": "abc123", "date": "2024-08-10", "weight": 77.4 } }
```

**201 Created** → `{ "success": true, "inserted_id": { "$oid": "..." } }`
**400** (missing `weight_update` wrapper or blank `user_id`) →
`{ "success": false, "error": "UserId is missing" }`
**422** → `{ "success": false, "errors": [...] }` (also logged via `Rails.logger.error`)

### 4.13 `GET /weight_updates/latest_weight?user_id=<id>`

`WeightUpdate.where(user_id:).order_by(:date.desc, _id: :desc).first` — the `_id`
tiebreaker makes same-day entries deterministic (latest insert wins).

**200 OK** → `{ "success": true, "weight": 77.4, "date": "2024-08-10" }`
**200 OK (none)** → `{ "success": false, "error": "No weight data found" }`

⚠️ No `user_id` presence check on this action (the `before_action` is `only: [:create]`).

---

### 4.14 `POST /moods` — save a daily mood

⚠️ Parameters are nested under **`mood_data`**, not `mood`, and are read directly
(no strong parameters).

```json
{ "mood_data": { "user_id": "abc123", "mood": "anxious", "date": "2024-08-25" } }
```

**200 OK** → `{ "success": true, "message": "Mood saved successfully" }`
**400** (any of `user_id`, `mood`, `date` blank) → `{ "success": false, "message": "Missing parameters" }`
**422** → `{ "success": false, "message": ["...error messages..."] }` — note `message`
holds an **array** here, unlike the string in the other branches.

⚠️ If the `mood_data` key is absent entirely, `params[:mood_data]` is `nil` and the
controller raises `NoMethodError` → `500`.

---

### 4.15 `POST /generate_recommendation` — AI wellbeing recommendation

The only endpoint with an external dependency. Request body is the same `mood_data`
envelope as `/moods` (`date` is accepted but unused in the computation).

```json
{ "mood_data": { "user_id": "abc123", "mood": "anxious", "date": "2024-08-25" } }
```

**Processing pipeline:**

1. Load the newest `UserData` for `user_id`.
   → **400** `{ "success": false, "message": "User data not found" }` if absent.
2. `base = LifeMethodsService.fetch_base_life_expectancy(user_data)`
3. `latest_weight = LifeMethodsService.fetch_latest_weight(user_id)`
4. `adjusted = LifeMethodsService.adjust_life_expectancy(base, user_data, latest_weight)`
5. `age = LifeMethodsService.calculate_age(user_data.dob)`
6. **`weeks_left_to_live = (adjusted - age) * 52`**
7. Read `gender` and `country` (used as "location") off the profile.
8. Guard: if `mood`, `location`, `gender`, `age`, or `weeks_left_to_live` is blank →
   **400** `{ "success": false, "message": "Missing parameters" }`
9. Build the prompt (verbatim, including the trailing string concatenation):

   ```
   The user is feeling {mood} today. They are {age} years old, living in {location},
   and identify as {gender}. They have approximately {weeks_left_to_live} weeks left
   to live. Provide a personalized recommendation to help the user make the most of
   their day based on their mood, and whenever possible, include concrete exercises,
   like breathing exercises for anxiety, on a maximum of 200 words altogether
   ```

10. Call OpenAI; return the assistant's message content, stripped.

**200 OK** → `{ "success": true, "recommendation": "…text…" }`
**422** (OpenAI call failed / non-200) → `{ "success": false, "message": "Failed to get recommendation" }`

#### OpenAI call specification (`MoodsController#query_chatgpt`)

Implemented with raw `Net::HTTP` (no SDK).

- **Endpoint:** `POST https://api.openai.com/v1/chat/completions` (SSL enabled)
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer #{ENV["CHATGPT_API_KEY"]}`
- **Body:**
  ```json
  {
    "model": "gpt-4o-mini",
    "messages": [
      { "role": "system", "content": "You are a coach with focus on mental health and training for healthy individuals." },
      { "role": "user", "content": "<prompt>" }
    ],
    "max_tokens": 300,
    "temperature": 0.7
  }
  ```
- **Success handling:** on HTTP `200`, log the full JSON at `info`, then return
  `json['choices'][0]['message']['content'].strip`.
- **Failure handling:** any non-`200` → log the response body at `error`, return `nil`.
  ⚠️ There is **no timeout, no retry, and no rescue** around the HTTP call — a network
  error propagates as a `500`.

---

## 5. Business logic — `LifeMethodsService`

Lives at `app/services/life_methods.rb`. ⚠️ **Filename/class mismatch**: the file is
`life_methods.rb` but the class is `LifeMethodsService`, which breaks Zeitwerk's naming
convention. Callers work around this with `require_dependency 'life_methods'` at the top
of `UserDataController` and `MoodsController`. A reimplementation should rename the file
to `life_methods_service.rb` and drop the `require_dependency` lines.

All methods are class methods; the service is stateless.

### 5.1 `fetch_base_life_expectancy(user_data) → Numeric`

```ruby
country_code = user_data.country.strip
gender       = user_data.gender.strip.capitalize   # "male" → "Male"
type         = "LifeExpectancy_Gen"

record = Mongoid.default_client[:life_expectancy].find(
  "Country_Code": country_code, "Gender": gender, "Type": type
).first

record ? record["Years"] : 0
```

- Returns **`0`** when no reference row matches — the caller cannot distinguish
  "unknown country" from a real answer of zero.
- ⚠️ Raises `NoMethodError` if `country` or `gender` is `nil` (both are presence-validated,
  so this only bites on legacy documents).
- Emits several `puts` debug lines.

### 5.2 `fetch_latest_weight(user_id) → Float | nil`

```ruby
WeightUpdate.where(user_id: user_id).order_by(date: :desc, _id: :desc).first&.weight
```

Returns `nil` when the user has never logged a weight.

### 5.3 `calculate_bmi(weight, height) → Float`

```ruby
height_in_meters = height / 100.0
weight / (height_in_meters ** 2)
```

Height in **centimetres**, weight in **kilograms**.

### 5.4 `calculate_age(dob) → Integer`

```ruby
today = Date.today
age = today.year - dob.year
age -= 1 if today < dob + age.years   # birthday hasn't happened yet this year
age
```

### 5.5 `adjust_life_expectancy(base, user_data, latest_weight = nil) → Numeric`

The core algorithm. Starts from `base` and applies four independent adjustments.
The weight used is `latest_weight || user_data.weight` — i.e. the most recent weigh-in,
falling back to the profile weight.

**Step 1 — Lifestyle**

| Condition | Adjustment |
|---|---|
| `smoking_status` truthy | **−10 years** |
| `drinking_status` truthy | **−4 years** |

**Step 2 — BMI** (`calculate_bmi(weight_to_use, user_data.height)`)

| BMI range | Adjustment |
|---|---|
| `19 .. 24.99` | 0 (healthy) |
| `25 .. 27.49` | **−1.5** |
| `27.5 .. 29.99` | **−3** |
| `30 .. 34.99` | **−6** |
| `35 .. 39.99` | **−6** |
| `40 .. ∞` | **−10** |
| anything else (i.e. BMI < 19) | **−2** |

⚠️ **The ranges have gaps.** They are written as inclusive float ranges
(`19..24.99`, `25..27.49`, …), so a BMI strictly between `24.99` and `25`, or between
`27.49` and `27.5`, or between `29.99` and `30`, etc., falls through every `when` clause
and hits the `else` branch — receiving the **underweight penalty of −2**. Example:
BMI `24.995` → −2 instead of 0. A reconstruction should use half-open ranges
(`19...25`, `25...27.5`, `27.5...30`, `30...35`, `35...40`, `40..`) and handle
`BMI < 19` explicitly.

**Step 3 — Training frequency** (`user_data.training_frequency`, sessions per week)

| Value | Adjustment |
|---|---|
| `0` | **−4** |
| `1..2` | **+4** |
| `3..4` | **+6** |
| `5..6` | **+8** |
| `7` | **+10** |
| other (negative, or > 7) | 0 (no `else` branch) |

**Return value:** the accumulated number. It is a `Float` whenever the −1.5 BMI branch
applies, otherwise typically an Integer or whatever numeric type `Years` was stored as.
There is **no clamping** — a heavy smoker/drinker with a bad BMI and an unmatched country
can produce a negative life expectancy, which in turn produces a negative
`weeks_left_to_live` in `/generate_recommendation`.

**Worked example**

> Male, Spain (`ESP`), base `83.2`, height `180 cm`, latest weight `95 kg`,
> non-smoker, drinker, trains 4×/week.
>
> - BMI = 95 / 1.8² = **29.32** → falls in `27.5..29.99` → **−3**
> - Drinking → **−4**
> - Training 4 → in `3..4` → **+6**
> - Result: 83.2 − 3 − 4 + 6 = **82.2**

---

## 6. Cross-cutting response conventions

Any reimplementation must reproduce these to stay wire-compatible.

### Envelope

Every endpoint returns an object with a boolean `success`. On success the payload sits
under a resource key (`training`, `trainings`, `user_data`, `data`, `weight`,
`recommendation`, `inserted_id`). On failure the message lands under **either** `error`
or `message` — the choice is inconsistent per endpoint and is documented per-endpoint in §4.

### Mongoid JSON serialisation ⚠️

`render json: <mongoid_document>` produces:

- `_id` as **`{ "$oid": "<24-hex>" }`**, not a bare string. This applies to the
  `inserted_id` field of every create response and to `_id` inside every returned document.
- `Date` fields as `"YYYY-MM-DD"`.
- `Time`/timestamp fields as ISO-8601 UTC (e.g. `"2024-06-14T12:02:57.000Z"`).
- No root wrapping (`include_root_in_json` is off) and no `_type` field.

A non-Mongoid reimplementation that emits `"_id": "665f..."` as a plain string **will
break** a client that reads `inserted_id.$oid`. Verify against the frontend before changing.

### Status codes

| Situation | Code used |
|---|---|
| Successful create | `201` — **except `POST /stretches`, which returns `200`** |
| Successful read | `200` |
| Validation failure | `422` — **except `POST /stretches`, which returns `200`** |
| Missing `user_id` | `400` (only on trainings reads and `POST /weight_updates`) |
| Resource not found | **`200` with `success: false`** everywhere except `training-stats` (`404`) |

### Parameter wrapper names (a frequent source of 400s)

| Endpoint | Required top-level key |
|---|---|
| `POST /user_data` | `user_data` |
| `POST /trainings` | `training` |
| `POST /training-repository` | **`training`** (not `training_repository`) |
| `POST /stretches` | `stretch` |
| `POST /weight_updates` | `weight_update` |
| `POST /moods` | **`mood_data`** |
| `POST /generate_recommendation` | **`mood_data`** |

A missing wrapper on a strong-parameters endpoint raises
`ActionController::ParameterMissing` → `400`.

---

## 7. Controller-level guards

`TrainingsController`:
```ruby
before_action :check_user_id, only: [:latest_trainings, :initial_trainings, :all_trainings]

def check_user_id
  render json: { success: false, error: 'UserId is missing' }, status: :bad_request if params[:user_id].blank?
end
```
⚠️ The three guarded actions each **repeat the same check inline**, so the logic is
duplicated. `training_stats` is not in the `before_action` list but performs its own
inline check.

`WeightUpdatesController`:
```ruby
before_action :check_user_id, only: [:create]

def check_user_id
  if params[:weight_update].blank? || params[:weight_update][:user_id].blank?
    render json: { success: false, error: 'UserId is missing' }, status: :bad_request
  end
end
```

`UserDataController`, `MoodsController`, `StretchesController` have **no `before_action`
guards** at all.

`ApplicationController` is bare: `class ApplicationController < ActionController::API; end`.
There is no shared error handling, no `rescue_from`, no request authentication.

---

## 8. Testing

The test suite is **scaffolding only** — every test file contains a commented-out
`test "the truth"` placeholder. There is not a single executing assertion in the repo.

```
test/
  test_helper.rb                                    # parallelize + fixtures :all
  controllers/
    trainings_controller_test.rb                    # empty
    user_data_controller_test.rb                    # empty
    moods_controller_test.rb                        # empty
    weight_updates_controller_test.rb               # empty
    life_expectancy_controller_test.rb              # empty, controller doesn't exist
    life_expectanty_controller_test.rb              # empty, typo'd duplicate
  models/
    training_test.rb, mood_test.rb, weight_update_test.rb   # all empty
  channels/application_cable/connection_test.rb     # empty
  fixtures/
    trainings.yml, moods.yml, weight_updates.yml    # ActiveRecord fixtures ⚠️
```

⚠️ The fixtures are **ActiveRecord** YAML fixtures whose columns match the *old*
Postgres schema (`trainings` with `date`/`weight`), not the current Mongoid models.
`fixtures :all` in `test_helper.rb` will try to load them into Postgres. They are dead
weight and should be discarded in a reconstruction.

**Recommended test coverage for the rebuild** (none of this exists today):

- `LifeMethodsService.adjust_life_expectancy` — one case per BMI band and per training
  band, plus the gap cases (24.995, 27.495, 29.995) to pin down chosen behaviour.
- `calculate_age` — birthday before/on/after today, leap-day DOB.
- `calculate_bmi` — known value.
- `fetch_base_life_expectancy` — match, no-match (returns 0), case-insensitive gender,
  whitespace-padded country.
- `fetch_latest_weight` — none, one, several including same-date tiebreak.
- Every endpoint: happy path, missing `user_id`, missing wrapper key, empty result set.
- `/generate_recommendation` with the OpenAI call stubbed: 200, non-200, network error.

---

## 9. PostgreSQL / ActiveRecord — the vestigial half ⚠️

This is the single most confusing aspect of the codebase and a reconstruction should
decide explicitly what to do with it.

**What exists:**

- `config/database.yml` — Postgres for dev/test/production.
  ⚠️ **It contains hardcoded plaintext credentials** (`username: mememtomaster`,
  `password: mememtoMoriApp`) committed to the repository. These should be rotated and
  moved to environment variables, or the file deleted along with the rest of the AR stack.
- `db/migrate/20240614120257_create_trainings.rb` and `db/schema.rb` — a `trainings`
  table with `user_id:integer, date:date, weight:float, timestamps`. This shape does
  **not** match the current `Training` Mongoid model at all; it is a leftover from an
  earlier design.
- `app/models/application_record.rb` — abstract AR base class with **zero subclasses**.
- `bin/docker-entrypoint` runs `./bin/rails db:prepare`, which touches Postgres.
- Test fixtures target the AR schema.

**What actually happens at runtime:** nothing. No controller, service, or model reads or
writes Postgres. All persistence is Mongoid.

**Recommendation for the parallel repo:** drop ActiveRecord entirely — remove the `pg`
gem, `database.yml`, `db/migrate`, `db/schema.rb`, `ApplicationRecord`, the AR fixtures,
and the `db:prepare` step in the entrypoint. Replace `require "rails/all"` with the
specific frameworks actually needed (`action_controller/railtie`, and `action_cable`
only if channels are ever added). This removes a whole class of boot-time failure and
deletes the committed credentials.

**Other production-readiness gaps to resolve during reconstruction:**

1. **`config/mongoid.yml` has no `production:` section.** Booting with
   `RAILS_ENV=production` — which is exactly what the Dockerfile sets — will fail to
   configure Mongoid. Add a production client driven by a `MONGODB_URI` env var, and
   parameterise dev/test the same way instead of hardcoding `localhost:27017`.
2. **CORS is pinned to `http://localhost:4200`.** Drive allowed origins from an env var.
3. **No authentication or authorization.** Any caller can read or write any user's data
   by guessing a `user_id`. If this is more than a local prototype, it needs a real
   identity layer, and `user_id` must be derived from the authenticated principal rather
   than read from request params.
4. **`puts` debug statements** in `TrainingsController`, `UserDataController`, and
   `LifeMethodsService` — replace with `Rails.logger.debug` or remove.
5. **`Rails.logger.info("GPT Response: ...")`** logs the full OpenAI response body,
   which contains user-derived content. Reconsider under the log-level/PII policy already
   noted in `config/environments/production.rb`.
6. **No timeouts or error handling on the OpenAI call** — add `open_timeout`/`read_timeout`
   and a `rescue` so a slow upstream cannot exhaust the Puma thread pool.
7. `config/credentials.yml.enc` is committed but `config/master.key` is gitignored — the
   encrypted credentials are therefore **undecryptable** in a fresh clone. Nothing reads
   them today; regenerate if credentials are ever needed.

---

## 10. Reconstruction checklist

A parallel implementation is functionally complete when it satisfies all of the following.

**Data layer**
- [ ] Six collections: `user_data`, `trainings`, `weight_updates`, `moods`,
      `training_repository`, `stretch_repository` — fields and types per §3.
- [ ] Reference collection `life_expectancy` seeded with
      `Country_Code` / `Gender` / `Type` / `Years` documents (§3.7).
- [ ] Presence validations on `UserData` (7 fields) and `WeightUpdate` (3 fields);
      no validations on `Training`, `Mood`, or the two repositories.
- [ ] Timestamps on everything **except `WeightUpdate`**.
- [ ] `UserData` treated as append-only history, read newest-first (oldest-first only in
      `training-stats`).

**Business logic**
- [ ] `adjust_life_expectancy` reproducing the four adjustment steps of §5.5 exactly,
      with an explicit decision recorded on the BMI range gaps.
- [ ] `fetch_base_life_expectancy` returning `0` on no match, with
      `country.strip` and `gender.strip.capitalize` normalisation.
- [ ] `fetch_latest_weight` with the `date desc, _id desc` ordering.
- [ ] `calculate_bmi` (cm/kg) and `calculate_age` (birthday-aware).
- [ ] `weeks_left_to_live = (adjusted_life_expectancy − age) × 52`.

**API surface**
- [ ] All 16 routes at the exact paths in §4, including the awkward
      `/user_data/user_data` and the hyphenated `/trainings/*` collection paths.
- [ ] Request wrapper keys exactly as in §6 (especially `mood_data`, and `training`
      for `POST /training-repository`).
- [ ] Response envelopes, key names (`error` vs `message` per endpoint), and status
      codes per §4 and §6.
- [ ] `_id` / `inserted_id` serialised as `{ "$oid": "..." }` if the client depends on it.
- [ ] `GET /up` health endpoint returning 200 when the app boots.

**Integration**
- [ ] OpenAI Chat Completions call: `gpt-4o-mini`, the exact system prompt, the exact
      user-prompt template, `max_tokens: 300`, `temperature: 0.7`, `CHATGPT_API_KEY`.
- [ ] CORS allowing the frontend origin, all methods, any header.

**Operational**
- [ ] MongoDB connection configured for every environment the app actually boots in.
- [ ] No plaintext credentials in version control.
- [ ] Tests per §8 — the current repo provides none.
