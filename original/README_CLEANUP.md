# Cleanup & Refactor Plan

## Unused Files to Remove
- .DS_Store
- apple-touch-icon-precomposed.png
- apple-touch-icon.png
- favicon-96x96.png
- favicon.svg
- icon-512.png
- registers.js (users)

## Refactor Suggestions
- Merge profile.js logic for admin and users if possible.
- Extract modal and table rendering utilities to utils.js.
- Unify service worker runtime caching logic.
- Remove orphaned images/icons not referenced in HTML/manifest/JS.
- Bundle/minify all JS for each app.
- Document all public functions and add comments for complex logic.

## Next Steps
- Remove listed files from both admin and users folders.
- Refactor shared logic as described above.
