# How It Works

Skillmark auto-generates tests from SKILL.md using an enhanced generation flow that leverages skill-creator and claude-code-guide for high-quality test output.

## Architecture

```
┌─────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐
│  SKILL.md   │────▶│  skill-creator + @claude-code-guide │────▶│ Analysis JSON│
└─────────────┘     └─────────────────────────────────────┘     └──────┬───────┘
                                    │ (fails)                          │
                                    ▼                                  │
                         ┌──────────────────┐                          │
                         │ Graceful Degrade │                          │
                         └────────┬─────────┘                          │
                                  │                                    │
                                  ▼                                    ▼
                    ┌─────────────────────────┐         ┌─────────────────────────┐
                    │     Basic Prompt        │         │    Enhanced Prompt      │
                    └───────────┬─────────────┘         └───────────┬─────────────┘
                                │                                   │
                                └───────────────┬───────────────────┘
                                                ▼
                                    ┌───────────────────┐
                                    │  Claude CLI (JSON) │
                                    └─────────┬─────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │   Test Files      │
                                    │ (skill/tests/*.md)│
                                    └───────────────────┘
```

### Flow Summary

1. **Test Discovery** - `discoverTests()` checks for existing tests in `tests/`, `test/`, `__tests__/`
2. **Auto-Generation Trigger** - If no tests found, triggers `generateTestsFromSkillMd()`
3. **Enhanced Analysis** - Invokes skill-creator with @claude-code-guide reference
4. **Prompt Building** - Creates enhanced or basic prompt based on analysis result
5. **Test Generation** - Claude CLI generates tests in JSON format
6. **File Writing** - Tests written to `<skill>/tests/` directory

---

## Key Features

### 1. skill-creator Integration

Extracts structured analysis from SKILL.md:

| Field | Description |
|-------|-------------|
| `capabilities` | Core capabilities (3-6 items) |
| `keyConcepts` | Key topics/keywords (5-10 items) |
| `edgeCases` | Failure scenarios to test (3-5 items) |
| `testingPatterns` | Claude Code testing best practices |
| `toolInvocationExpectations` | Expected tool calls |

### 2. @claude-code-guide Reference

Embedded in the skill-creator prompt to fetch Claude Code-specific testing patterns via subagent routing.

### 3. Retry-then-Degrade Pattern

- 1 retry attempt with 2s delay
- Falls back to basic generation if analysis fails
- Ensures test generation always succeeds

### 4. Auto-Installation

Installs skill-creator automatically if missing:
```bash
npx skills add https://github.com/anthropics/claudekit-skills --skill skill-creator -a claude-code -g -y
```

---

## skill-creator Skill

**Location:** `~/.claude/skills/skill-creator`

**Purpose:** Analyze skill structure, extract capabilities, concepts, and generate skill metadata.

### Invocation

```typescript
const prompt = `Analyze the skill at ${skillPath}.

Use @"claude-code-guide (agent)" to understand Claude Code CLI patterns for testing skills.

Extract and return ONLY a JSON object with this structure:
{
  "capabilities": ["what the skill can do"],
  "keyConcepts": ["key topics/keywords"],
  "edgeCases": ["failure scenarios to test"],
  "testingPatterns": ["Claude Code testing best practices"],
  "toolInvocationExpectations": ["expected tool calls"]
}`;
```

### CLI Arguments

```bash
claude -p "$prompt" \
  --allowedTools "Skill(~/.claude/skills/skill-creator),Read,Glob,Task" \
  --output-format json \
  --model haiku \
  --dangerously-skip-permissions
```

**Model:** `haiku` (fast, cost-effective for analysis)

---

## claude-code-guide Subagent

**Type:** Built-in Claude Code subagent

**Purpose:** Provide Claude Code CLI documentation, testing patterns, and best practices.

### Invocation Method

Prompt engineering with `@"claude-code-guide (agent)"` reference:

```
Use @"claude-code-guide (agent)" to understand Claude Code CLI patterns for testing skills.
```

Claude's built-in subagent routing handles the reference, fetching relevant context about:
- Skill invocation patterns
- Testing best practices
- Common failure modes
- Tool usage expectations

### Why Prompt Engineering?

Single invocation approach benefits:
- Reduced latency (no separate API call)
- Combined context (skill analysis + testing patterns)
- Simpler error handling

---

## Error Handling

### Retry Configuration

```typescript
await withRetry(
  () => invokeSkillCreator(skillPath, skillCreatorPath),
  {
    maxRetries: 1,      // 1 retry attempt
    delayMs: 2000,      // 2 second delay between retries
    onRetry: (attempt, error) => {
      console.log(`Retrying skill analysis (attempt ${attempt + 1}): ${error.message}`);
    },
  }
);
```

### Degradation Levels

| Scenario | Behavior |
|----------|----------|
| skill-creator succeeds | Enhanced prompt with analysis |
| skill-creator fails after retry | Basic prompt (TEST_GENERATION_PROMPT) |
| Claude CLI fails | Fallback single test |

---

## Module Structure

```
src/engine/
├── markdown-test-definition-parser.ts  # Main orchestrator
├── skill-creator-invoker.ts            # skill-creator invocation
├── enhanced-test-prompt-builder.ts     # Prompt construction
├── retry-with-degrade-utils.ts         # Retry utilities
└── skill-content-collector.ts          # SKILL.md content collection
```

### Responsibilities

| Module | Purpose |
|--------|---------|
| `markdown-test-definition-parser.ts` | Orchestrates test discovery and generation |
| `skill-creator-invoker.ts` | Invokes skill-creator, parses analysis JSON |
| `enhanced-test-prompt-builder.ts` | Builds prompts from analysis or fallback |
| `retry-with-degrade-utils.ts` | Generic retry logic with graceful degradation |
| `skill-content-collector.ts` | Collects SKILL.md, references, scripts |

---

## Output Format

Generated tests follow the skillmark markdown format:

```yaml
---
name: skill-name-topic
type: knowledge|task
concepts:
  - concept-1
  - concept-2
timeout: 120
---

# Prompt

The test prompt here...

# Expected

The response should cover:
- [ ] Expected item 1
- [ ] Expected item 2
```

Tests are written to `<skill>/tests/<name>-test.md`.
