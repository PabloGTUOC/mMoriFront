# mMori - Life & Wellness Tracker

> A comprehensive personal wellness and life tracking Angular application with life expectancy visualization, training management, mood tracking, and health metrics.

![Angular](https://img.shields.io/badge/Angular-18.0-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Architecture](#architecture)
- [Security](#security)
- [Testing](#testing)
- [Contributing](#contributing)

## ✨ Features

### Core Functionality

- **Life Expectancy Visualization**: Unique D3.js chart showing weeks lived vs. weeks remaining
- **Daily Dashboard**: Track age, BMI, weight, training stats, and adjusted life expectancy
- **Training Repository**: Manage and track training exercises with duration and calories
- **Stretch Repository**: Log and manage stretching routines
- **Mood Tracking**: Track daily moods with AI-powered recommendations
- **Weight History**: Interactive charts showing weight trends over time

### User Experience

- **🌓 Dark Mode**: Toggle between light and dark themes with system preference detection
- **📱 Progressive Web App**: Installable on mobile and desktop with offline support
- **🔐 Authentication**: Google Sign-In via Firebase with secure auth guards
- **♿ Accessibility**: ARIA labels and keyboard navigation support
- **📊 Data Visualization**: Interactive D3.js charts with tooltips and animations

### Technical Features

- **TypeScript Interfaces**: Comprehensive type safety with model interfaces
- **Error Handling**: Global error handler with user-friendly notifications
- **Input Sanitization**: XSS and SQL injection protection
- **HTTP Interceptor**: Automatic timeout, retry, and loading state management
- **Code Quality**: ESLint and Prettier configuration for consistent code style
- **Auth Guards**: Route protection for authenticated and new users

## 🛠️ Tech Stack

### Frontend
- **Angular 18** - Modern web application framework
- **TypeScript 5.4** - Type-safe JavaScript
- **RxJS 7.8** - Reactive programming
- **D3.js 7.9** - Data visualization
- **Angular Material 18** - Material Design components
- **Bootstrap 5.3** - Responsive CSS framework

### Backend Integration
- **Firebase 10.12** - Authentication and backend services
- **Express API** - RESTful API (localhost:3000)

### Development Tools
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Jasmine & Karma** - Testing framework
- **Angular CLI 18** - Build and development tools

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI 18

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mMoriFront.git
   cd mMoriFront
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Update `src/environments/environment.ts` and `src/environments/environment development.ts` with your Firebase credentials:

   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000',
     firebaseConfig: {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       // ... other config
     }
   };
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open browser**

   Navigate to `http://localhost:4200/`

### Backend Setup

Ensure your Express backend is running on `http://localhost:3000` with the following endpoints:

- `POST /user_data` - Submit user data
- `GET /user_data/user_data` - Get user data
- `GET /trainings/training-stats` - Get training statistics
- `GET /weight_updates/latest_weight` - Get latest weight
- `POST /trainings` - Submit training
- `POST /stretches` - Submit stretch
- `POST /moods` - Submit mood
- `POST /generate_recommendation` - Get AI recommendations

## 💻 Development

### Available Scripts

```bash
# Development
npm start              # Start dev server
npm run watch          # Watch mode build

# Building
npm run build          # Production build

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint errors
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting

# Testing
npm test               # Run unit tests
```

### Project Structure

```
src/
├── app/
│   ├── components/           # Shared components
│   │   ├── spinner.component.ts
│   │   └── weight-history-chart/
│   ├── guards/              # Route guards
│   │   ├── auth.guard.ts
│   │   └── new-user.guard.ts
│   ├── interceptor/         # HTTP interceptor
│   ├── models/              # TypeScript interfaces
│   │   ├── user.model.ts
│   │   ├── training.model.ts
│   │   ├── weight.model.ts
│   │   └── mood.model.ts
│   ├── services/            # Application services
│   │   ├── auth.service.ts
│   │   ├── theme.service.ts
│   │   ├── error-handler.service.ts
│   │   ├── sanitization.service.ts
│   │   └── notification.service.ts
│   ├── display-daily/       # Main dashboard
│   ├── first-time/          # Onboarding
│   ├── life-expectancy-chart/
│   ├── training-repository/
│   ├── stretch-repository/
│   └── thoughts/            # Mood tracking
├── environments/            # Environment configs
└── styles/                 # Global styles
    └── themes.scss         # Dark/light theme variables
```

## 🏗️ Architecture

### State Management

- **BehaviorSubjects**: Reactive state management for user data, theme, and auth
- **Services**: Centralized business logic and API communication
- **RxJS Observables**: Async data streams throughout the application

### Component Architecture

- **Standalone Components**: Modern Angular 18 standalone architecture
- **Smart/Presentational**: Separation of concerns with container and presentation components
- **Lazy Loading**: Route-based code splitting for optimal performance

### Security Layers

1. **Authentication Guards**: Protect routes requiring login
2. **Input Sanitization**: Prevent XSS and SQL injection
3. **HTTP Interceptor**: Automatic retry and timeout handling
4. **Error Boundary**: Global error handler for graceful failures
5. **Environment Config**: Secure API URL management

## 🔒 Security

### Implemented Security Features

- ✅ Firebase Authentication with Google Sign-In
- ✅ Route guards preventing unauthorized access
- ✅ Input sanitization for all user inputs
- ✅ XSS protection via Angular DomSanitizer
- ✅ SQL injection pattern detection
- ✅ Secure HTTP interceptor with timeout
- ✅ Environment-based API configuration

### Best Practices

- Never commit sensitive credentials
- Use environment variables for configuration
- Sanitize all user inputs before processing
- Validate data on both client and server
- Use HTTPS in production

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Tests are written using Jasmine and run with Karma. Test files are located alongside their components with `.spec.ts` extension.

### E2E Tests

E2E testing infrastructure is set up for future implementation using Playwright.

## 📝 Code Quality

### ESLint Configuration

The project uses ESLint with TypeScript support:

- Warns on `any` types
- Warns on unused variables
- Allows `console.warn` and `console.error`
- Integrates with Prettier

### Prettier Configuration

Consistent code formatting with:

- Single quotes
- 2-space indentation
- 100 character line width
- Semicolons enabled
- Trailing commas (ES5)

## 🎨 Theming

### Dark Mode

Toggle between light and dark themes using the sun/moon button in the header:

- **Automatic Detection**: Uses `prefers-color-scheme` system preference
- **Persistent**: Saves preference to localStorage
- **Smooth Transitions**: Animated theme switching
- **CSS Variables**: Centralized color management

### Customization

Theme variables are defined in `src/styles/themes.scss`:

```scss
:root {
  --primary-color: #1976d2;
  --background-color: #ffffff;
  --text-primary: #212121;
  // ... more variables
}

.dark-theme {
  --primary-color: #90caf9;
  --background-color: #121212;
  --text-primary: #ffffff;
  // ... dark theme overrides
}
```

## 📱 Progressive Web App

The app is installable on mobile and desktop devices:

- **Manifest**: Web app manifest with icons
- **Service Worker**: Offline caching for resilience
- **Icons**: Multiple sizes (72x72 to 512x512)
- **Standalone Mode**: Full-screen app experience

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow Angular style guide
- Write meaningful commit messages
- Add unit tests for new features
- Run `npm run lint:fix` and `npm run format` before committing
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Angular team for the amazing framework
- D3.js for powerful visualizations
- Firebase for authentication services
- Material Design for UI components

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Made with ❤️ using Angular 18**
