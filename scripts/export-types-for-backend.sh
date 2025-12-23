#!/bin/bash

# Script to export TypeScript types for backend integration
# Usage: ./scripts/export-types-for-backend.sh [output-directory]

OUTPUT_DIR=${1:-"../backend-types"}

echo "📦 Exporting TypeScript types for backend..."
echo "Output directory: $OUTPUT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Copy model files
echo "Copying model files..."
cp -r src/app/models/* "$OUTPUT_DIR/"

# Create README for backend developers
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# TypeScript Type Definitions for mMori Backend

These TypeScript interfaces define the data contracts between frontend and backend.

## Installation

### Option 1: Copy to your TypeScript backend
Simply copy these files to your backend `src/models/` directory.

### Option 2: Use in JavaScript backend with JSDoc
Convert interfaces to JSDoc comments for type checking.

## Usage in TypeScript Backend

```typescript
import { UserData, UserDataResponse } from './models';

export async function createUser(data: UserData): Promise<UserDataResponse> {
  // Your implementation
}
```

## Usage in JavaScript Backend with JSDoc

```javascript
/**
 * @typedef {import('./models/user.model').UserData} UserData
 * @typedef {import('./models/user.model').UserDataResponse} UserDataResponse
 */

/**
 * @param {UserData} data
 * @returns {Promise<UserDataResponse>}
 */
async function createUser(data) {
  // Your implementation
}
```

## Validation Example

```typescript
import { UserData } from './models';

function validateUserData(data: any): data is UserData {
  return (
    typeof data.user_id === 'string' &&
    typeof data.dob === 'string' &&
    typeof data.height === 'number' &&
    typeof data.weight === 'number' &&
    // ... more validation
  );
}
```

## Files Included

- `index.ts` - Central export file
- `user.model.ts` - User data types
- `training.model.ts` - Training types
- `weight.model.ts` - Weight tracking types
- `mood.model.ts` - Mood tracking types
- `stretch.model.ts` - Stretch types
- `http-state.model.ts` - HTTP state types

## Integration

See the frontend repository's `docs/BACKEND_INTEGRATION.md` for detailed integration guide.

## Version

Keep these types in sync with frontend version: Check frontend package.json for current version.
EOF

# Create a package.json for the types
cat > "$OUTPUT_DIR/package.json" << 'EOF'
{
  "name": "@mmori/shared-types",
  "version": "1.0.0",
  "description": "Shared TypeScript type definitions for mMori frontend and backend",
  "main": "index.ts",
  "types": "index.ts",
  "scripts": {
    "build": "tsc"
  },
  "keywords": ["types", "typescript", "mmori"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

# Create tsconfig for the shared types
cat > "$OUTPUT_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

echo "✅ Types exported successfully!"
echo ""
echo "Next steps:"
echo "1. Review the exported types in: $OUTPUT_DIR"
echo "2. Copy to your backend or install as a package"
echo "3. See docs/BACKEND_INTEGRATION.md for integration guide"
echo ""
echo "To use in your backend:"
echo "  Option A: Copy files to backend/src/models/"
echo "  Option B: npm install file:$OUTPUT_DIR"
echo ""
