# Backend Integration Guide

## Options for Aligning Frontend and Backend

### Option 1: Shared Types Package (Recommended)

Create a separate npm package with shared TypeScript interfaces.

#### Setup Steps:

1. **Create shared package repository**
   ```bash
   mkdir mMori-shared-types
   cd mMori-shared-types
   npm init -y
   ```

2. **Add TypeScript**
   ```bash
   npm install --save-dev typescript
   ```

3. **Create tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "declaration": true,
       "outDir": "./dist",
       "strict": true
     },
     "include": ["src/**/*"]
   }
   ```

4. **Copy type definitions**
   ```bash
   # Copy from frontend
   cp -r src/app/models/* mMori-shared-types/src/
   ```

5. **Publish to npm or use locally**
   ```json
   // Frontend package.json
   {
     "dependencies": {
       "@mmori/shared-types": "file:../mMori-shared-types"
     }
   }

   // Backend package.json
   {
     "dependencies": {
       "@mmori/shared-types": "file:../mMori-shared-types"
     }
   }
   ```

---

### Option 2: Git Submodules

Share types using git submodules.

```bash
# In your types repo
git init mMori-types
cd mMori-types
# Add type files

# In frontend
git submodule add ../mMori-types src/shared-types

# In backend
git submodule add ../mMori-types src/shared-types
```

---

### Option 3: Copy Types to Backend

Simply copy the TypeScript interfaces to your backend.

**Frontend to Backend conversion:**

```typescript
// Frontend (TypeScript)
export interface UserData {
  user_id: string;
  dob: string;
  gender: string;
  // ...
}

// Backend (JavaScript with JSDoc)
/**
 * @typedef {Object} UserData
 * @property {string} user_id
 * @property {string} dob
 * @property {string} gender
 */

// Or Backend (TypeScript)
interface UserData {
  user_id: string;
  dob: string;
  gender: string;
}
```

---

### Option 4: OpenAPI/Swagger Specification

Generate types from OpenAPI spec.

1. **Backend: Create OpenAPI spec**
   ```yaml
   # openapi.yaml
   openapi: 3.0.0
   info:
     title: mMori API
     version: 1.0.0
   paths:
     /user_data:
       post:
         requestBody:
           content:
             application/json:
               schema:
                 $ref: '#/components/schemas/UserData'
   components:
     schemas:
       UserData:
         type: object
         properties:
           user_id:
             type: string
           dob:
             type: string
   ```

2. **Generate TypeScript types**
   ```bash
   npm install -g openapi-typescript
   openapi-typescript openapi.yaml --output src/app/models/api-types.ts
   ```

---

## Practical Steps for Your Backend

### 1. Copy Type Definitions

Copy these files from frontend to backend:

```bash
# From mMoriFront/src/app/models/
user.model.ts
training.model.ts
weight.model.ts
mood.model.ts
stretch.model.ts
```

### 2. Backend Validation

Use the types to validate incoming requests:

```typescript
// backend/src/validators/user.validator.ts
import { UserData } from '../models/user.model';

export function validateUserData(data: any): data is UserData {
  return (
    typeof data.user_id === 'string' &&
    typeof data.dob === 'string' &&
    typeof data.gender === 'string' &&
    typeof data.height === 'number' &&
    typeof data.weight === 'number' &&
    // ... more validation
  );
}
```

### 3. Backend Response Types

Ensure responses match frontend expectations:

```typescript
// backend/src/controllers/user.controller.ts
import { UserDataResponse } from '../models/user.model';

export async function getUserData(req, res) {
  try {
    const userData = await db.getUserData(req.query.user_id);

    const response: UserDataResponse = {
      success: true,
      user_data: userData,
      adjusted_life_expectancy: calculateLifeExpectancy(userData)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

---

## Environment Alignment

### Frontend Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.mmori.com'
};
```

### Backend Configuration

```javascript
// backend/.env.development
PORT=3000
FRONTEND_URL=http://localhost:4200
NODE_ENV=development

// backend/.env.production
PORT=3000
FRONTEND_URL=https://mmori.com
NODE_ENV=production
```

---

## CORS Setup in Backend

```javascript
// backend/src/app.js
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:4200',  // Development
  'https://mmori.com'       // Production
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

## Database Schema Alignment

Ensure your database schema matches the TypeScript interfaces:

### PostgreSQL Example

```sql
-- User Data Table
CREATE TABLE user_data (
  user_id VARCHAR(255) PRIMARY KEY,
  dob DATE NOT NULL,
  gender VARCHAR(50) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  country VARCHAR(100) NOT NULL,
  smoking_status BOOLEAN DEFAULT FALSE,
  drinking_status BOOLEAN DEFAULT FALSE,
  training_frequency INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training Table
CREATE TABLE trainings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES user_data(user_id),
  training_date DATE NOT NULL,
  training_type VARCHAR(100) NOT NULL,
  duration INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weight Updates Table
CREATE TABLE weight_updates (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES user_data(user_id),
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moods Table
CREATE TABLE moods (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES user_data(user_id),
  mood VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Testing Backend/Frontend Integration

### 1. Create Integration Tests

```typescript
// backend/tests/integration/api.test.ts
import request from 'supertest';
import app from '../src/app';
import { UserData } from '../models/user.model';

describe('User Data API', () => {
  it('should create user data', async () => {
    const userData: UserData = {
      user_id: 'test123',
      dob: '1990-01-01',
      gender: 'male',
      height: 180,
      weight: 75,
      country: 'USA',
      smoking_status: false,
      drinking_status: false,
      training_frequency: 3
    };

    const response = await request(app)
      .post('/user_data')
      .send({ user_data: userData })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### 2. API Contract Testing

Use tools like Pact or Dredd:

```bash
npm install --save-dev dredd

# Test API against documentation
dredd docs/API_CONTRACT.md http://localhost:3000
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Frontend
        run: |
          cd frontend
          npm install
          npm run build

      - name: Install Backend
        run: |
          cd backend
          npm install

      - name: Run Backend Tests
        run: |
          cd backend
          npm test

      - name: Integration Tests
        run: |
          cd backend
          npm start &
          cd ../frontend
          npm run test:integration
```

---

## Version Control Strategy

### Semantic Versioning

Keep frontend and backend versions aligned:

```json
// Frontend package.json
{
  "name": "mmori-front",
  "version": "1.2.0"
}

// Backend package.json
{
  "name": "mmori-backend",
  "version": "1.2.0"
}
```

### API Versioning

```typescript
// Backend routes
app.use('/api/v1/user_data', userDataRoutes);
app.use('/api/v1/trainings', trainingRoutes);

// Frontend environment
export const environment = {
  apiUrl: 'http://localhost:3000/api/v1'
};
```

---

## Monitoring and Debugging

### Request/Response Logging

```typescript
// Backend middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query
  });
  next();
});

// Frontend interceptor (already implemented)
// Logs are in HttpInterceptorService
```

---

## Quick Start Checklist

- [ ] Copy TypeScript models to backend
- [ ] Update backend to return `{ success: boolean }` format
- [ ] Configure CORS for frontend origin
- [ ] Set up environment variables
- [ ] Test all endpoints with Postman/curl
- [ ] Verify Firebase token validation
- [ ] Check database schema matches models
- [ ] Run integration tests
- [ ] Update API documentation
- [ ] Deploy both frontend and backend together

---

## Support

For questions about integration, see:
- `API_CONTRACT.md` - API endpoint documentation
- Frontend models in `src/app/models/`
- This guide

Happy integrating! 🚀
