---
phase: 4
status: pending
priority: medium
effort: M
---

# Phase 4: Copy UI on Skill Detail Page

## Context
- [plan.md](./plan.md)
- Depends on Phase 2 + 3 (embed script must be servable)

## Overview
Add an "Embed" button on the skill detail page next to the radar chart. Clicking opens a popover/modal with the pre-filled `<script>` tag, a theme toggle preview, and a "Copy" button with clipboard feedback.

## Key Insight
- Radar chart is in `.radar-section` at line 1775 of `html-pages-renderer.ts`
- Existing UI patterns: modals exist (report modal), buttons styled consistently
- All rendering is server-side HTML with inline JS — no framework

## Related Code Files
- **Modify:** `packages/webapp/src/routes/html-pages-renderer.ts`
  - CSS styles section (~line 1604+)
  - Radar section HTML (~line 1775)
  - JavaScript section (end of file, existing modal/tab JS)

## Implementation Steps

1. **Add "Embed" button** next to "Performance Profile" heading in radar section:
   ```html
   <section class="section radar-section">
     <div class="section-header">
       <h2>Performance Profile</h2>
       <button class="embed-btn" onclick="toggleEmbedPopover()">
         &lt;/&gt; Embed
       </button>
     </div>
     <div class="radar-container">${radarSvg}</div>
     <!-- Embed popover -->
     <div id="embed-popover" class="embed-popover hidden">...</div>
   </section>
   ```

2. **Embed popover content:**
   - Pre-filled code snippet in a `<code>` block
   - Theme selector: dark (default) / light radio buttons
   - Width input: number field, default 360
   - Live preview of the snippet updates as options change
   - "Copy" button with clipboard API
   - Success feedback: "Copied!" text for 2s

3. **Popover CSS:**
   - Absolute positioned below the embed button
   - Dark card style matching existing UI (border: 1px solid var(--border))
   - Code block with monospace font, subtle bg
   - Max-width ~500px

4. **Inline JavaScript:**
   ```javascript
   function toggleEmbedPopover() {
     document.getElementById('embed-popover').classList.toggle('hidden');
   }
   function updateEmbedSnippet() {
     const theme = document.querySelector('input[name="embed-theme"]:checked').value;
     const width = document.getElementById('embed-width').value || '360';
     const skill = '{skillName}';
     const snippet = `<script src="https://skillmark.sh/embed.js" data-skill="${skill}" data-theme="${theme}" data-width="${width}"></script>`;
     document.getElementById('embed-code').textContent = snippet;
   }
   function copyEmbedCode() {
     const code = document.getElementById('embed-code').textContent;
     navigator.clipboard.writeText(code).then(() => {
       const btn = document.getElementById('copy-embed-btn');
       btn.textContent = 'Copied!';
       setTimeout(() => btn.textContent = 'Copy', 2000);
     });
   }
   ```

5. **Server-side:** Pass `skill.skillName` into the template for the snippet generation

## Todo
- [ ] Add "Embed" button to radar section header
- [ ] Create embed popover HTML with code snippet, theme toggle, width input
- [ ] Add popover CSS styles
- [ ] Add JavaScript for toggle, snippet update, clipboard copy
- [ ] Ensure popover closes when clicking outside

## Success Criteria
- "Embed" button visible on skill detail page next to radar chart heading
- Clicking opens popover with correct pre-filled snippet
- Theme toggle updates snippet in real-time
- Width input updates snippet
- Copy button copies to clipboard with "Copied!" feedback
- Popover dismissible by clicking outside or button again
