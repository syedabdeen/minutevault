## Branding
- Use the shared Logo component and CDN image pointers for application branding; keep real favicon files in public so browser icons work without imports.

## Meeting audio
- Record mono PCM locally in IndexedDB and upload complete 16 kHz WAV parts; this avoids WebSocket dependence and malformed recorder chunks.
- Keep audio in the private meeting-recordings bucket under owner/meeting folders and issue signed URLs only for playback; recordings must not become public.
- Cache authenticated AI segment results and process sequentially with no automatic retries; this avoids duplicate billing and preserves terminal failures.
- Persist AI access/credit pauses server-side and require explicit administrator recovery; page reloads must not restart denied work.
- Treat speaker identities and timestamps as estimates local to each part; never fabricate cross-part acoustic speaker matching.- Installability is manifest-only (public/manifest.webmanifest); public/sw.js is a kill-switch that removes the old offline worker, because cached app shells kept phones on stale builds.
