# Skillmark API Reference

**Base URL:** `https://skillmark.sh`

All endpoints return JSON. CORS is enabled globally (`origin: *`).

---

## Public Endpoints

### GET /health

Health check.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-02-12T08:00:00.000Z" }
```

---

### GET /api/leaderboard

Paginated skill rankings ordered by composite score.

**Query params:**

| Param    | Type | Default | Description |
|----------|------|---------|-------------|
| `limit`  | int  | 20      | Max 100     |
| `offset` | int  | 0       | Pagination  |

**Response:**
```json
{
  "entries": [
    {
      "skillId": "abc123",
      "skillName": "my-skill",
      "source": "git",
      "bestAccuracy": 92.5,
      "bestSecurity": 85.0,
      "bestTrigger": 90.0,
      "compositeScore": 90.25,
      "bestModel": "sonnet",
      "repoUrl": "https://github.com/user/skill",
      "avgTokens": 3200,
      "avgCost": 0.012,
      "lastTested": "2026-02-12T08:00:00.000Z",
      "totalRuns": 15
    }
  ]
}
```

---

### GET /api/skill/:name

Skill details with result history. Cached for 1 hour (`Cache-Control: public, max-age=3600`).

**Path params:**

| Param  | Description |
|--------|-------------|
| `name` | Skill name (URL-encoded) |

**Response:**
```json
{
  "skillId": "abc123",
  "skillName": "my-skill",
  "source": "git",
  "bestAccuracy": 92.5,
  "bestSecurity": 85.0,
  "bestTrigger": 90.0,
  "compositeScore": 90.25,
  "bestModel": "sonnet",
  "repoUrl": "https://github.com/user/skill",
  "avgTokens": 3200,
  "avgCost": 0.012,
  "lastTested": "2026-02-12T08:00:00.000Z",
  "totalRuns": 15,
  "history": [
    {
      "id": "result-uuid",
      "accuracy": 92.5,
      "model": "sonnet",
      "tokensTotal": 3200,
      "durationMs": 12000,
      "costUsd": 0.012,
      "toolCount": 5,
      "securityScore": 85.0,
      "triggerScore": 90.0,
      "consistencyJson": null,
      "baselineJson": null,
      "date": "2026-02-12T08:00:00.000Z"
    }
  ]
}
```

**Errors:** `404` if skill not found.

---

### GET /api/result/:id

Full result detail (parsed raw benchmark JSON).

**Response:** Raw `BenchmarkResult` JSON (structure varies). Returns `404` if result not found or no raw data stored.

---

### GET /api/result/:id/test-files

Test definition files used in a benchmark run.

**Response:**
```json
{
  "files": [
    { "name": "test-knowledge.md", "content": "---\nname: test-knowledge\n..." }
  ]
}
```

**Errors:** `404` if no test files available.

---

### GET /api/result/:id/report

Benchmark report markdown for a result.

**Response:**
```json
{ "markdown": "# Benchmark Report\n..." }
```

**Errors:** `404` if report not available.

---

## Authenticated Endpoints

All authenticated endpoints require either a session cookie (browser) or Bearer token (CLI).

### POST /api/results

Submit benchmark results. Requires API key.

**Headers:**
```
Authorization: Bearer sk_<api-key>
```

**Request body:**

| Field             | Type     | Required | Description |
|-------------------|----------|----------|-------------|
| `skillId`         | string   | Yes      | Unique skill identifier |
| `skillName`       | string   | Yes      | Human-readable name |
| `source`          | string   | No       | Source type (local/git/skillsh) |
| `model`           | string   | Yes      | `haiku`, `sonnet`, or `opus` |
| `accuracy`        | number   | Yes      | 0-100 |
| `tokensTotal`     | number   | No       | Total tokens used |
| `tokensInput`     | number   | No       | Input tokens |
| `tokensOutput`    | number   | No       | Output tokens |
| `durationMs`      | number   | No       | Execution time in ms |
| `costUsd`         | number   | No       | Estimated cost in USD |
| `toolCount`       | number   | No       | Tools invoked |
| `runs`            | number   | No       | Number of iterations |
| `hash`            | string   | Yes      | Deterministic result hash |
| `timestamp`       | string   | No       | ISO 8601 timestamp |
| `rawJson`         | string   | No       | Full BenchmarkResult JSON |
| `securityScore`   | number   | No       | 0-100 security score |
| `securityJson`    | string   | No       | Security breakdown JSON |
| `triggerScore`    | number   | No       | 0-100 trigger score |
| `consistencyJson` | string   | No       | Consistency metrics JSON |
| `baselineJson`    | string   | No       | Baseline comparison JSON |
| `testFiles`       | array    | No       | `[{name, content}]` |
| `skillshLink`     | string   | No       | skill.sh registry link |
| `repoUrl`         | string   | No       | Git repository URL |
| `reportMarkdown`  | string   | No       | Benchmark report markdown |

**Response:**
```json
{
  "success": true,
  "resultId": "uuid",
  "leaderboardUrl": "https://skillmark.sh/?skill=my-skill",
  "rank": 3,
  "submitter": {
    "github": "username",
    "avatar": "https://avatars.githubusercontent.com/..."
  }
}
```

**Errors:** `401` invalid/missing key, `400` missing required fields or invalid model/accuracy.

---

### POST /api/verify

Verify an API key is valid.

**Headers:**
```
Authorization: Bearer sk_<api-key>
```

**Response:**
```json
{ "valid": true }
```

---

## Auth Endpoints (Browser OAuth)

### GET /auth/github

Redirects to GitHub OAuth consent screen. Scopes: `read:user`, `user:email`.

### GET /auth/github/callback

OAuth callback. Sets session cookie and redirects to `/dashboard`.

### GET /auth/logout

Clears session cookie and redirects to `/`.

### GET /auth/me

Returns current authenticated user info (session cookie required).

**Response:**
```json
{
  "id": "user-uuid",
  "githubUsername": "username",
  "githubAvatar": "https://avatars.githubusercontent.com/..."
}
```

### POST /auth/keys

Generate a new API key. Session cookie required.

**Response:**
```json
{
  "apiKey": "sk_<64-hex-chars>",
  "keyId": "uuid",
  "message": "API key generated. Store it securely - it cannot be retrieved again."
}
```

### GET /auth/keys

List current user's API keys (IDs only, not secrets). Session cookie required.

**Response:**
```json
{
  "keys": [
    { "id": "uuid", "createdAt": "2026-02-12T08:00:00.000Z", "lastUsedAt": null }
  ]
}
```

### DELETE /auth/keys/:id

Revoke an API key. Session cookie required. Returns `404` if key not found or doesn't belong to user.

**Response:**
```json
{ "success": true }
```

### POST /auth/verify-key

Verify API key and return associated user info (used by CLI).

**Headers:**
```
Authorization: Bearer sk_<api-key>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "githubUsername": "username",
    "githubAvatar": "https://avatars.githubusercontent.com/..."
  }
}
```

---

## Static Assets

| Path | Description | Cache |
|------|-------------|-------|
| `/embed.js` | Embeddable radar chart widget | 7 days |
| `/favicon.ico` | Favicon (PNG) | 1 year |
| `/favicon.png` | Favicon (PNG) | 1 year |
| `/og-image.png` | Open Graph image (SVG) | 1 day |

---

## Embed Widget

Add a radar chart to any page:

```html
<script src="https://skillmark.sh/embed.js" data-skill="skill-name" data-theme="dark"></script>
```

| Attribute      | Required | Default  | Description |
|----------------|----------|----------|-------------|
| `data-skill`   | Yes      | —        | Skill name |
| `data-theme`   | No       | `dark`   | `dark` or `light` |
| `data-width`   | No       | `350px`  | CSS width value |

Renders inside Shadow DOM for style isolation. Fetches from `/api/skill/:name`.

---

## Error Format

All error responses follow:

```json
{ "error": "Description of the error" }
```

Common HTTP status codes: `400` bad request, `401` unauthorized, `404` not found, `500` internal error.
