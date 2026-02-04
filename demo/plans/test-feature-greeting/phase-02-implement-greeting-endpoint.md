# Phase 2: Implement Greeting Endpoint

## Overview

**Priority:** High
**Status:** Pending
**Dependencies:** Phase 1 complete

Implement the GET `/api/greet/:name` endpoint with validation.

---

## Implementation Steps

1. Create validation middleware `src/middleware/validate-name.ts`:
   ```typescript
   import { Request, Response, NextFunction } from 'express';

   export function validateName(req: Request, res: Response, next: NextFunction) {
     const { name } = req.params;

     if (!name || name.length < 1 || name.length > 50) {
       return res.status(400).json({
         error: 'Name must be between 1 and 50 characters'
       });
     }

     if (!/^[a-zA-Z0-9]+$/.test(name)) {
       return res.status(400).json({
         error: 'Name must contain only alphanumeric characters'
       });
     }

     next();
   }
   ```

2. Create greeting handler `src/handlers/greet.ts`:
   ```typescript
   import { Request, Response } from 'express';

   export function greetHandler(req: Request, res: Response) {
     const { name } = req.params;

     res.json({
       message: `Hello, ${name}!`,
       timestamp: new Date().toISOString()
     });
   }
   ```

3. Update `src/index.ts` to register route:
   ```typescript
   import express from 'express';
   import { validateName } from './middleware/validate-name';
   import { greetHandler } from './handlers/greet';

   const app = express();
   const PORT = process.env.PORT || 3000;

   app.get('/api/greet/:name', validateName, greetHandler);

   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });

   export { app };
   ```

---

## Todo List

- [ ] Create src/middleware/ directory
- [ ] Create validate-name.ts middleware
- [ ] Create src/handlers/ directory
- [ ] Create greet.ts handler
- [ ] Update src/index.ts with route
- [ ] Test manually with curl

---

## Success Criteria

- GET /api/greet/John returns `{"message": "Hello, John!", "timestamp": "..."}`
- GET /api/greet/ returns 404
- GET /api/greet/a (1 char) returns 200
- GET /api/greet/{51 chars} returns 400
- GET /api/greet/John@Doe returns 400
