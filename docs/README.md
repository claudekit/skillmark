# Skillmark Documentation

Welcome to the Skillmark documentation suite. This directory contains all technical documentation for the agent skill benchmarking platform.

## Quick Navigation

### Getting Started
- **New to Skillmark?** Start with [Project Overview & PDR](./project-overview-pdr.md)
- **Setting up development?** Read [Codebase Summary](./codebase-summary.md) first
- **Writing code?** Follow [Code Standards](./code-standards.md)

### For Different Roles

#### Product Managers
- [Project Overview & PDR](./project-overview-pdr.md) - Goals, requirements, success criteria
- [Project Roadmap](./project-roadmap.md) - Timeline, phases, milestones

#### Developers
- [Codebase Summary](./codebase-summary.md) - Code structure and organization
- [Code Standards](./code-standards.md) - TypeScript conventions and patterns
- [System Architecture](./system-architecture.md) - Component design and data flow

#### DevOps/Infrastructure
- [Deployment Guide](./deployment-guide.md) - CLI npm publishing, Cloudflare Workers deployment
- [System Architecture](./system-architecture.md) - Deployment architecture and scaling

#### Architects
- [System Architecture](./system-architecture.md) - Complete system design
- [Code Standards](./code-standards.md) - Technical patterns and decisions

#### New Team Members
1. Read [Project Overview & PDR](./project-overview-pdr.md) (15 min)
2. Skim [Codebase Summary](./codebase-summary.md) (15 min)
3. Review [Code Standards](./code-standards.md) sections relevant to your work (30 min)
4. Deep dive into [System Architecture](./system-architecture.md) (45 min)
5. Reference [Project Roadmap](./project-roadmap.md) for context (10 min)

---

## Documentation Map

```
docs/
├── README.md (you are here)
│   Navigation and overview
│
├── project-overview-pdr.md (244 lines)
│   Product vision, goals, requirements, success criteria
│   ↓ Read this first for business context
│
├── codebase-summary.md (386 lines)
│   Code structure, key modules, data flow overview
│   ↓ Read this to understand codebase organization
│
├── code-standards.md (661 lines)
│   TypeScript conventions, naming, patterns, best practices
│   ↓ Reference this while writing code
│
├── system-architecture.md (625 lines)
│   Component design, data flows, database schema, deployment
│   ↓ Read this for technical decision-making
│
├── project-roadmap.md (456 lines)
│   Timeline, phases, milestones, success metrics
│   ↓ Check this for project status and planning
│
└── deployment-guide.md (706 lines)
    CLI npm publishing, Cloudflare deployment, CI/CD
    ↓ Follow this to deploy code
```

**Total:** 3,078 lines of documentation
**Status:** Complete for v0.1 release

---

## Key Concepts

### What is Skillmark?

Skillmark is a benchmarking platform for evaluating Claude AI skill effectiveness:

```
Developer ──creates tests──> Skill ──runs benchmark──> Metrics
                                          │
                                          ▼
                              Public Leaderboard
```

**Three main components:**
1. **CLI Tool** (@skillmark/cli) - Run benchmarks locally
2. **API** (@skillmark/webapp) - Submit results, view rankings
3. **Leaderboard UI** - Public skill rankings

### Core Data Model

```
Skill (test target)
  ├─ Source (local path, Git URL, or skill.sh identifier)
  ├─ Tests (markdown files with YAML frontmatter)
  │  └─ Each test has: name, type, concepts, prompt, expected patterns
  └─ Results (from benchmark execution)
     ├─ Metrics (accuracy %, tokens, cost, duration)
     ├─ Matched concepts
     └─ Model used (haiku/sonnet/opus)
```

### Benchmark Flow

```
Input Skill Source
    ↓
Resolve (local/git/skill.sh)
    ↓
Load Tests
    ↓
For Each Test × Runs:
  ├─ Invoke Claude CLI with prompt
  ├─ Parse response (transcript JSONL)
  ├─ Score against concepts (pattern matching)
  └─ Collect metrics (tokens, cost, time)
    ↓
Aggregate Results
    ↓
Output (JSON + Markdown)
    ↓
Auto-publish to API (default, use --no-publish to skip)
```

---

## Common Tasks

### I want to...

**...understand how the code is organized**
→ Read [Codebase Summary](./codebase-summary.md)

**...implement a new feature**
→ Follow [Code Standards](./code-standards.md) during development

**...understand system design decisions**
→ Study [System Architecture](./system-architecture.md)

**...know the project timeline and status**
→ Check [Project Roadmap](./project-roadmap.md)

**...deploy code to production**
→ Follow [Deployment Guide](./deployment-guide.md)

**...understand the product vision**
→ Read [Project Overview & PDR](./project-overview-pdr.md)

**...improve performance or fix bugs**
→ Reference [System Architecture](./system-architecture.md) for bottlenecks and [Code Standards](./code-standards.md) for patterns

---

## Key Files in Codebase

### CLI Package (`packages/cli/src/`)
| File | Purpose |
|------|---------|
| `cli-entry-point.ts` | Main CLI router, command dispatcher |
| `commands/run-benchmark-command.ts` | Benchmark execution orchestrator |
| `engine/markdown-test-definition-parser.ts` | YAML frontmatter parsing |
| `engine/claude-cli-executor.ts` | Claude subprocess management |
| `engine/concept-accuracy-scorer.ts` | Response scoring against concepts |
| `sources/unified-skill-source-resolver.ts` | Skill source routing (local/git/skill.sh) |
| `types/benchmark-types.ts` | Core TypeScript interfaces |

### Webapp Package (`packages/webapp/src/`)
| File | Purpose |
|------|---------|
| `worker-entry-point.ts` | Cloudflare Worker entry point |
| `routes/api-endpoints-handler.ts` | REST API implementation |
| `routes/github-oauth-authentication-handler.ts` | OAuth flow |
| `routes/html-pages-renderer.ts` | Leaderboard UI HTML generation |

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Root workspace, scripts |
| `pnpm-workspace.yaml` | pnpm monorepo configuration |
| `packages/cli/package.json` | CLI package metadata |
| `packages/webapp/wrangler.toml` | Cloudflare Worker configuration |

---

## Development Workflow

### Setup
```bash
git clone https://github.com/claudekit/skillmark
cd skillmark
pnpm install
```

### Development
```bash
# Build both packages
pnpm build

# Watch mode
pnpm dev

# Test CLI locally
node packages/cli/dist/cli-entry-point.js run --help
```

### Testing
```bash
# Run all tests
pnpm test

# Run linting
pnpm lint

# Type check
pnpm tsc --noEmit
```

### Deployment
```bash
# CLI to npm
pnpm --filter @skillmark/cli build
npm publish

# Webapp to Cloudflare
pnpm --filter @skillmark/webapp deploy
```

See [Deployment Guide](./deployment-guide.md) for detailed steps.

---

## Design Principles

### 1. **Graceful Degradation**
If optional features fail (skill-creator enhancement), continue with basic approach rather than crash.

**Example:** Test enhancement fails → use original prompt instead of aborting.

### 2. **Type Safety**
Use TypeScript strict mode to catch errors at compile time, not runtime.

**Example:** All interfaces defined upfront, no `any` types.

### 3. **Clear Separation of Concerns**
Each module has single responsibility.

**Example:**
- `sources/` handles skill discovery
- `engine/` handles benchmarking
- `commands/` handles CLI interaction

### 4. **Performance First**
Consider performance in design:
- Cache skill sources to avoid re-cloning
- Parallel test execution where possible
- Database indexing for common queries

### 5. **Security Conscious**
- Never log API keys
- Use SHA-256 for key hashing
- Validate all user inputs
- Timeout all external operations

---

## Common Patterns

### Error Handling
```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
  throw new OperationError('User-friendly message', originalError);
}
```

### Async Operations
```typescript
// Always await
const result = await loadData();

// Parallel execution
const results = await Promise.all(
  items.map(item => processItem(item))
);
```

### Type Definitions
```typescript
// Use interfaces for objects
interface TestDefinition {
  name: string;
  concepts: string[];
  // ...
}

// Use unions for variants
type SkillSourceType = 'local' | 'git' | 'skillsh';

// Use enums sparingly (unions preferred)
type Model = 'haiku' | 'sonnet' | 'opus';
```

---

## Version Information

| Component | Current | Target |
|-----------|---------|--------|
| Skillmark | 0.1.0 | 1.0.0 |
| Node.js | 18+ | 18+ |
| TypeScript | 5.3.3 | 5.3+ |
| Cloudflare Workers | Latest | Latest |

---

## Getting Help

### Questions About...

**Code structure?** → [Codebase Summary](./codebase-summary.md)

**Coding style?** → [Code Standards](./code-standards.md)

**How feature X works?** → [System Architecture](./system-architecture.md)

**When will feature X ship?** → [Project Roadmap](./project-roadmap.md)

**How do I deploy?** → [Deployment Guide](./deployment-guide.md)

**Product decisions?** → [Project Overview & PDR](./project-overview-pdr.md)

### Contributing

Before submitting PR:
1. Read [Code Standards](./code-standards.md)
2. Follow style conventions
3. Run `pnpm lint && pnpm build && pnpm test`
4. Reference related docs in commit message

---

## Document Maintenance

These documents are living guides. Update them when:
- Code structure changes significantly
- New patterns are established
- Architecture decisions are made
- Deployment procedures change
- Roadmap status updates

**Last Updated:** February 2025
**Maintainers:** Engineering team
**Version Alignment:** 0.1.0
