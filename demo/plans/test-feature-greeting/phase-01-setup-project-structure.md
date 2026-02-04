# Phase 1: Setup Project Structure

## Overview

**Priority:** High
**Status:** Pending
**Dependencies:** None

Create the basic project scaffolding for the greeting API.

---

## Implementation Steps

1. Create directory structure:
   ```
   greeting-api/
   ├── src/
   ├── tests/
   └── package.json
   ```

2. Initialize package.json with:
   ```json
   {
     "name": "greeting-api",
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "test": "vitest run",
       "test:watch": "vitest"
     },
     "dependencies": {
       "express": "^4.18.2"
     },
     "devDependencies": {
       "@types/express": "^4.17.21",
       "@types/node": "^20.10.0",
       "tsx": "^4.6.0",
       "typescript": "^5.3.0",
       "vitest": "^1.0.0",
       "supertest": "^6.3.3",
       "@types/supertest": "^6.0.2"
     }
   }
   ```

3. Create `src/index.ts` boilerplate:
   ```typescript
   import express from 'express';

   const app = express();
   const PORT = process.env.PORT || 3000;

   // TODO: Add greeting endpoint in Phase 2

   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });

   export { app };
   ```

4. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "node",
       "esModuleInterop": true,
       "strict": true,
       "outDir": "dist"
     },
     "include": ["src/**/*", "tests/**/*"]
   }
   ```

5. Run `npm install`

---

## Todo List

- [ ] Create greeting-api directory
- [ ] Create src/ and tests/ directories
- [ ] Create package.json
- [ ] Create tsconfig.json
- [ ] Create src/index.ts boilerplate
- [ ] Run npm install

---

## Success Criteria

- Directory structure exists
- Dependencies installed
- TypeScript compiles without errors
