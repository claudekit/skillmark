# Phase 4: Update Documentation

## Overview

**Priority:** Medium
**Status:** Pending
**Dependencies:** Phase 3 complete

Update README with API documentation and usage examples.

---

## Implementation Steps

1. Create/Update `README.md`:
   ```markdown
   # Greeting API

   Simple REST API for greeting users.

   ## Quick Start

   ```bash
   npm install
   npm run dev
   ```

   ## API Endpoints

   ### GET /api/greet/:name

   Returns a personalized greeting.

   **Parameters:**
   - `name` (path): User's name (1-50 alphanumeric characters)

   **Response:**
   ```json
   {
     "message": "Hello, John!",
     "timestamp": "2026-02-03T12:00:00.000Z"
   }
   ```

   **Error Response (400):**
   ```json
   {
     "error": "Name must be between 1 and 50 characters"
   }
   ```

   ## Examples

   ```bash
   # Valid request
   curl http://localhost:3000/api/greet/John

   # Invalid request (special characters)
   curl http://localhost:3000/api/greet/John@Doe
   ```

   ## Testing

   ```bash
   npm test
   ```

   ## Project Structure

   ```
   greeting-api/
   ├── src/
   │   ├── index.ts           # App entry point
   │   ├── handlers/
   │   │   └── greet.ts       # Greeting handler
   │   └── middleware/
   │       └── validate-name.ts
   ├── tests/
   │   └── greet.test.ts
   └── package.json
   ```
   ```

---

## Todo List

- [ ] Create README.md
- [ ] Document API endpoints
- [ ] Add usage examples
- [ ] Document project structure
- [ ] Add testing instructions

---

## Success Criteria

- README.md exists
- API endpoint documented
- Usage examples included
- Project structure documented
