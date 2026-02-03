---
name: file-operations-workflow
type: task
concepts:
  - mkdir
  - write file
  - read file
  - edit file
  - delete file
timeout: 180
---

# Prompt

Create a directory called `test-workspace`, then:
1. Create a file `config.json` with `{"version": "1.0"}`
2. Create a file `data.txt` with "Hello World"
3. Read both files and confirm their contents
4. Edit `config.json` to change version to "2.0"
5. Delete `data.txt`
6. List the final directory contents

Report each step as you complete it.

# Expected

The response should demonstrate:
- [ ] Successfully creating the test-workspace directory
- [ ] Writing config.json with correct JSON content
- [ ] Writing data.txt with correct text content
- [ ] Reading and displaying file contents
- [ ] Editing config.json to update version
- [ ] Deleting data.txt
- [ ] Listing final directory showing only config.json
