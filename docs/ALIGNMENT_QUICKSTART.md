# 🚀 Quick Start: Aligning Frontend and Backend

This guide will help you quickly align the mMoriFront repository with your backend.

## ⚡ Fast Track (5 minutes)

### Step 1: Export Type Definitions

```bash
# From the frontend repository
cd mMoriFront
./scripts/export-types-for-backend.sh ../your-backend-repo/src/types
```

This copies all TypeScript interfaces to your backend.

### Step 2: Update Backend API Responses

Ensure your backend returns the expected format:

```javascript
// ❌ OLD FORMAT
res.json(userData);

// ✅ NEW FORMAT
res.json({
  success: true,
  user_data: userData,
  adjusted_life_expectancy: calculatedValue
});
```

### Step 3: Enable CORS

```javascript
// backend/src/app.js or server.js
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:4200',  // Frontend URL
  credentials: true
}));
```

### Step 4: Test Integration

```bash
# Start backend
cd your-backend-repo
npm start

# Start frontend (in another terminal)
cd mMoriFront
npm start
```

Visit `http://localhost:4200` and test!

---

## 📋 Backend Checklist

Use this checklist to ensure your backend is aligned:

### API Endpoints ✓

- [ ] `POST /user_data` - Create/update user data
- [ ] `GET /user_data/user_data?user_id=X` - Get user data
- [ ] `GET /trainings/training-stats?user_id=X` - Get training stats
- [ ] `POST /trainings` - Create training
- [ ] `GET /training-repository` - Get available exercises
- [ ] `POST /training-repository` - Add exercise
- [ ] `GET /weight_updates/latest_weight?user_id=X` - Get latest weight
- [ ] `POST /weight_updates` - Log weight
- [ ] `GET /stretches` - Get stretches
- [ ] `POST /stretches` - Add stretch
- [ ] `POST /moods` - Log mood
- [ ] `POST /generate_recommendation` - Get AI recommendation

### Response Format ✓

All responses should include:

```typescript
{
  success: boolean,
  // ... other data
  message?: string
}
```

### Error Handling ✓

- [ ] 400 for bad requests
- [ ] 401 for unauthorized
- [ ] 404 for not found
- [ ] 500 for server errors
- [ ] All errors return `{ success: false, message: "..." }`

### CORS ✓

- [ ] CORS enabled for frontend origin
- [ ] Credentials allowed if using cookies

### Environment ✓

- [ ] Port configured (default: 3000)
- [ ] Database connection working
- [ ] Firebase Admin SDK configured (for auth)

---

## 🔍 Detailed Alignment Steps

### 1. Copy TypeScript Types

**Automatic (Recommended):**
```bash
./scripts/export-types-for-backend.sh ../backend/src/types
```

**Manual:**
```bash
cp src/app/models/*.ts ../backend/src/types/
```

### 2. Update Each Endpoint

#### Example: User Data Endpoint

**Before:**
```javascript
app.get('/user_data/user_data', async (req, res) => {
  const userData = await db.getUserData(req.query.user_id);
  res.json(userData);
});
```

**After:**
```javascript
app.get('/user_data/user_data', async (req, res) => {
  try {
    const userData = await db.getUserData(req.query.user_id);
    const adjustedLife = calculateLifeExpectancy(userData);

    res.json({
      success: true,
      user_data: userData,
      adjusted_life_expectancy: adjustedLife
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

### 3. Add Request Validation

```javascript
// validators/user.validator.js
function validateUserData(data) {
  const errors = [];

  if (!data.user_id) errors.push('user_id is required');
  if (!data.dob) errors.push('dob is required');
  if (typeof data.height !== 'number') errors.push('height must be a number');
  if (typeof data.weight !== 'number') errors.push('weight must be a number');
  // ... more validation

  return {
    valid: errors.length === 0,
    errors
  };
}

// Use in route
app.post('/user_data', (req, res) => {
  const validation = validateUserData(req.body.user_data);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Process valid data...
});
```

### 4. Configure Environment Variables

```bash
# backend/.env
PORT=3000
DATABASE_URL=postgresql://localhost:5432/mmori
FRONTEND_URL=http://localhost:4200
NODE_ENV=development

# For Firebase Auth
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

```javascript
// backend/src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  }
};
```

---

## 🧪 Testing the Integration

### 1. Manual Testing with curl

```bash
# Test user data endpoint
curl -X GET "http://localhost:3000/user_data/user_data?user_id=test123"

# Expected response:
# {
#   "success": true,
#   "user_data": { ... },
#   "adjusted_life_expectancy": 78.5
# }
```

### 2. Test from Frontend

1. Start backend: `npm start` (in backend directory)
2. Start frontend: `npm start` (in frontend directory)
3. Open browser: `http://localhost:4200`
4. Check browser console for any errors
5. Test user flow: Login → Create profile → View dashboard

### 3. Check Network Tab

Open browser DevTools → Network tab:
- Verify requests go to `http://localhost:3000`
- Check response format matches expected types
- Ensure no CORS errors

---

## 🐛 Common Issues & Solutions

### Issue: CORS Error

**Symptom:** `Access to fetch at 'http://localhost:3000' from origin 'http://localhost:4200' has been blocked by CORS policy`

**Solution:**
```javascript
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
```

### Issue: Wrong Response Format

**Symptom:** Frontend errors like "Cannot read property 'user_data' of undefined"

**Solution:** Ensure all responses include `{ success: true/false }` wrapper

### Issue: 404 on All Routes

**Symptom:** All API calls return 404

**Solution:**
- Check backend is running on correct port (3000)
- Verify `environment.ts` has correct `apiUrl`
- Check route definitions in backend

### Issue: Authentication Errors

**Symptom:** 401 Unauthorized on protected routes

**Solution:**
- Verify Firebase token is being sent in headers
- Check Firebase Admin SDK is initialized correctly
- Ensure token validation middleware is working

---

## 📚 Reference Documents

For more detailed information, see:

- **API Contract**: `docs/API_CONTRACT.md` - Complete API specification
- **Integration Guide**: `docs/BACKEND_INTEGRATION.md` - Detailed integration strategies
- **TypeScript Models**: `src/app/models/` - Type definitions

---

## 🆘 Need Help?

1. Check the browser console for errors
2. Check backend logs
3. Verify environment configuration
4. Review API_CONTRACT.md for expected request/response formats
5. Test endpoints individually with curl or Postman

---

## ✅ Validation Checklist

Before deploying, verify:

- [ ] All endpoints return correct format
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Database schema matches types
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Authentication working
- [ ] Frontend can fetch data successfully
- [ ] No console errors in browser
- [ ] All user flows work end-to-end

---

**Time to complete:** ~15-30 minutes depending on backend complexity

**Questions?** See the detailed guides in `/docs` or open an issue.

Good luck! 🚀
