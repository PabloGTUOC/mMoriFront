# API Contract Documentation

## Overview
This document defines the API contracts between mMoriFront (frontend) and the backend API.

## Base URL
- Development: `http://localhost:3000`
- Production: Configure in `environment.ts`

## Authentication
All endpoints (except public ones) require Firebase Authentication token in headers:
```
Authorization: Bearer <firebase-token>
```

---

## User Data Endpoints

### POST /user_data
Create or update user data

**Request Body:**
```typescript
{
  user_data: {
    user_id: string;
    dob: string;           // ISO date format
    gender: string;
    height: number;        // in cm
    weight: number;        // in kg
    country: string;
    smoking_status: boolean;
    drinking_status: boolean;
    training_frequency: number;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  user_data?: UserData;
}
```

### GET /user_data/user_data
Get user data by user_id

**Query Parameters:**
- `user_id` (string, required)

**Response:**
```typescript
{
  success: boolean;
  user_data?: {
    user_id: string;
    dob: string;
    gender: string;
    height: number;
    weight: number;
    country: string;
    smoking_status: boolean;
    drinking_status: boolean;
    training_frequency: number;
    created_at?: string;
    updated_at?: string;
  };
  adjusted_life_expectancy?: number;
  message?: string;
}
```

---

## Training Endpoints

### POST /trainings
Create a new training entry

**Request Body:**
```typescript
{
  training: {
    user_id: string;
    training_date: string;    // ISO date format
    training_type: string;
    duration: number;         // in minutes
    calories_burned: number;
    description?: string;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### GET /trainings/training-stats
Get training statistics for a user

**Query Parameters:**
- `user_id` (string, required)

**Response:**
```typescript
{
  training_count: number;
  total_days_since_joining: number;
  average_calories_per_session?: number;
  total_duration?: number;
}
```

### GET /training-repository
Get available training exercises

**Response:**
```typescript
{
  success: boolean;
  data?: Array<{
    id: number;
    name: string;
    type: string;
    duration: number;
    calories: number;
    description?: string;
  }>;
}
```

### POST /training-repository
Add new training exercise to repository

**Request Body:**
```typescript
{
  name: string;
  type: string;
  duration: number;
  calories: number;
  description?: string;
}
```

---

## Weight Tracking Endpoints

### POST /weight_updates
Log a weight update

**Request Body:**
```typescript
{
  weight_update: {
    user_id: string;
    weight: number;        // in kg
    date: string;          // ISO date format
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### GET /weight_updates/latest_weight
Get user's latest weight

**Query Parameters:**
- `user_id` (string, required)

**Response:**
```typescript
{
  success: boolean;
  weight?: number;
  date?: string;
  message?: string;
}
```

### GET /weight_updates/history
Get weight history for charts

**Query Parameters:**
- `user_id` (string, required)
- `limit` (number, optional) - Default: 30

**Response:**
```typescript
{
  success: boolean;
  data?: Array<{
    date: string;
    weight: number;
  }>;
}
```

---

## Stretch Endpoints

### GET /stretches
Get all stretches

**Response:**
```typescript
{
  success: boolean;
  data?: Array<{
    id?: number;
    name: string;
    type: string;
    duration: number;
    description?: string;
  }>;
}
```

### POST /stretches
Add new stretch

**Request Body:**
```typescript
{
  name: string;
  type: string;
  duration: number;
  description?: string;
}
```

---

## Mood Tracking Endpoints

### POST /moods
Save mood entry

**Request Body:**
```typescript
{
  user_id: string;
  mood: "Optimistic & Social" | "Angry & Moody" | "Calm & Analytic" | "Relax & Pacific";
  date: string;    // ISO date format
}
```

**Response:**
```typescript
{
  success: boolean;
  message?: string;
}
```

### POST /generate_recommendation
Get AI-powered mood recommendation

**Request Body:**
```typescript
{
  mood: string;
  user_id?: string;
}
```

**Response:**
```typescript
{
  recommendation: string;
}
```

---

## Error Responses

All endpoints should return appropriate HTTP status codes:

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User doesn't have permission
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

**Error Response Format:**
```typescript
{
  success: false;
  message: string;
  error?: string;
}
```

---

## CORS Configuration

Backend must allow requests from frontend origin:

```javascript
// Example Express CORS config
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
```

---

## Data Validation

### Backend Validation Rules

**User Data:**
- `user_id`: Required, non-empty string
- `dob`: Required, valid ISO date
- `height`: Number, 50-250 cm
- `weight`: Number, 20-300 kg
- `training_frequency`: Number, 0-7 days per week

**Training:**
- `duration`: Number, 1-1440 minutes
- `calories_burned`: Number, 0-10000

**Weight:**
- `weight`: Number, 20-300 kg

**Input Sanitization:**
All string inputs should be sanitized to prevent:
- XSS attacks
- SQL injection
- Script injection

---

## Security Requirements

1. **Authentication**: Verify Firebase tokens on protected endpoints
2. **Rate Limiting**: Implement rate limiting (e.g., 100 requests/minute per user)
3. **Input Validation**: Validate all inputs server-side
4. **SQL Injection Prevention**: Use parameterized queries
5. **HTTPS**: Use HTTPS in production

---

## Migration Notes

If updating from an older API version, ensure:

1. Environment configuration updated with `apiUrl`
2. All endpoints return `success` boolean
3. Error responses include proper HTTP status codes
4. CORS configured for frontend origin

---

## Testing the API

Use the provided TypeScript interfaces from `src/app/models/` to ensure type safety.

Example test with curl:
```bash
# Get user data
curl -X GET "http://localhost:3000/user_data/user_data?user_id=test123" \
  -H "Authorization: Bearer <token>"

# Create training
curl -X POST "http://localhost:3000/trainings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "training": {
      "user_id": "test123",
      "training_date": "2025-12-23",
      "training_type": "cardio",
      "duration": 30,
      "calories_burned": 250
    }
  }'
```
