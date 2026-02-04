# Benchmark Workflow: 21-Step File Operations

**WORKSPACE**: Replace `{WORKSPACE}` with actual workspace path provided by user.

---

## Phase 1: Directory Setup (Steps 1-4)

### Step 1
Create directory: `{WORKSPACE}/benchmark-test/`

### Step 2
Create directory: `{WORKSPACE}/benchmark-test/src/`

### Step 3
Create directory: `{WORKSPACE}/benchmark-test/docs/`

### Step 4
Create directory: `{WORKSPACE}/benchmark-test/config/`

---

## Phase 2: File Creation (Steps 5-10)

### Step 5
Create file `{WORKSPACE}/benchmark-test/README.md` with content:
```
# Benchmark Test
Created: {current_timestamp}
```

### Step 6
Create file `{WORKSPACE}/benchmark-test/src/main.py` with content:
```python
def greet(name):
    """Greet a person by name."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))
```

### Step 7
Create file `{WORKSPACE}/benchmark-test/src/utils.py` with content:
```python
def format_name(first, last):
    """Format first and last name."""
    return f"{first} {last}"
```

### Step 8
Create file `{WORKSPACE}/benchmark-test/docs/setup.md` with content:
```markdown
## Setup
1. Install deps
```

### Step 9
Create file `{WORKSPACE}/benchmark-test/config/settings.json` with content:
```json
{"debug": true, "version": "1.0.0"}
```

### Step 10
Create file `{WORKSPACE}/benchmark-test/.gitignore` with content:
```
__pycache__
*.pyc
.env
```

---

## Phase 3: Read Operations (Steps 11-13)

### Step 11
Read `{WORKSPACE}/benchmark-test/src/main.py` and report the total line count.

### Step 12
Read `{WORKSPACE}/benchmark-test/README.md` and report the first line only.

### Step 13
Search for "def " pattern in `{WORKSPACE}/benchmark-test/src/` directory and report all matches.

---

## Phase 4: Modify Operations (Steps 14-17)

### Step 14
Append to `{WORKSPACE}/benchmark-test/README.md`:
```

## Features
- Feature 1
```

### Step 15
Edit `{WORKSPACE}/benchmark-test/src/main.py`: Add `import utils` at the very top (line 1).

### Step 16
Edit `{WORKSPACE}/benchmark-test/config/settings.json`: Change `"debug": true` to `"debug": false`.

### Step 17
Rename `{WORKSPACE}/benchmark-test/src/utils.py` to `{WORKSPACE}/benchmark-test/src/helpers.py`:
- Create new file `helpers.py` with same content
- Delete old file `utils.py`

---

## Phase 5: Verification (Steps 18-21)

### Step 18
List all files in `{WORKSPACE}/benchmark-test/` recursively and report the file tree.

### Step 19
Verify:
- `{WORKSPACE}/benchmark-test/src/helpers.py` EXISTS
- `{WORKSPACE}/benchmark-test/src/utils.py` does NOT exist

### Step 20
Create `{WORKSPACE}/benchmark-test/COMPLETION.md` listing steps 1-19 with their completion status:
```markdown
# Completion Report

| Step | Status |
|------|--------|
| 1    | DONE   |
| 2    | DONE   |
...
| 19   | DONE   |
```

### Step 21
Run verification script (use absolute path):
```bash
~/.claude/skills/.venv/bin/python3 /Users/duynguyen/www/claudekit/skill-validation/scripts/verify-steps.py {WORKSPACE}
```
