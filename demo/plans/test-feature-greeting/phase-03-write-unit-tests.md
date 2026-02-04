# Phase 3: Write Unit Tests

## Overview

**Priority:** High
**Status:** Pending
**Dependencies:** Phase 2 complete

Write comprehensive unit tests for the greeting endpoint.

---

## Implementation Steps

1. Create `tests/greet.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import request from 'supertest';
   import { app } from '../src/index';

   describe('GET /api/greet/:name', () => {
     describe('valid requests', () => {
       it('should greet a simple name', async () => {
         const res = await request(app).get('/api/greet/John');

         expect(res.status).toBe(200);
         expect(res.body.message).toBe('Hello, John!');
         expect(res.body.timestamp).toBeDefined();
       });

       it('should handle single character name', async () => {
         const res = await request(app).get('/api/greet/A');

         expect(res.status).toBe(200);
         expect(res.body.message).toBe('Hello, A!');
       });

       it('should handle 50 character name', async () => {
         const longName = 'A'.repeat(50);
         const res = await request(app).get(`/api/greet/${longName}`);

         expect(res.status).toBe(200);
       });

       it('should handle alphanumeric name', async () => {
         const res = await request(app).get('/api/greet/John123');

         expect(res.status).toBe(200);
         expect(res.body.message).toBe('Hello, John123!');
       });
     });

     describe('invalid requests', () => {
       it('should reject name longer than 50 chars', async () => {
         const longName = 'A'.repeat(51);
         const res = await request(app).get(`/api/greet/${longName}`);

         expect(res.status).toBe(400);
         expect(res.body.error).toContain('50 characters');
       });

       it('should reject name with special characters', async () => {
         const res = await request(app).get('/api/greet/John@Doe');

         expect(res.status).toBe(400);
         expect(res.body.error).toContain('alphanumeric');
       });

       it('should reject name with spaces', async () => {
         const res = await request(app).get('/api/greet/John%20Doe');

         expect(res.status).toBe(400);
       });
     });

     describe('response format', () => {
       it('should return valid ISO timestamp', async () => {
         const res = await request(app).get('/api/greet/Test');

         const timestamp = new Date(res.body.timestamp);
         expect(timestamp.toString()).not.toBe('Invalid Date');
       });
     });
   });
   ```

2. Run tests: `npm test`

---

## Todo List

- [ ] Create tests/greet.test.ts
- [ ] Write valid request tests
- [ ] Write invalid request tests
- [ ] Write response format tests
- [ ] Run npm test and verify all pass

---

## Success Criteria

- All tests pass
- Coverage includes:
  - Valid names (simple, single char, max length, alphanumeric)
  - Invalid names (too long, special chars, spaces)
  - Response format validation
