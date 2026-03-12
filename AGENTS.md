# Agent Guide

## Start Here
- Product goals: [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
- System architecture:
- Data model:
- Integrations:
- UX:
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Decisions log: [docs/DECISIONS.md](docs/DECISIONS.md)
- Testing protocol:

## Mission

## Product Boundaries
- In scope:
- Out of scope:

## Engineering Guardrails

## Documentation Governance
- Docs are code. Any behavior/interface/schema change must include doc updates in the same PR.
- Add dated entries to [docs/DECISIONS.md](docs/DECISIONS.md) for non-trivial product or architecture decisions.
- Keep [docs/ROADMAP.md](docs/ROADMAP.md) accurate at milestone boundaries.
- Use stable terms from this guide in all docs and code comments.
- 
## Canonical Terms

## Definition of Done for Feature PRs
- Feature behavior implemented.
- Validation completed.
- Docs updated if behavior, interfaces, or scope changed.
- Handoff includes what changed and how it was verified.
- Interfaces/types reflected in docs.
- Decision recorded when architecture or product direction changed.
- No stale contradictions across docs.
- UI-impacting changes verified in-browser via Chrome MCP before handoff.
- For UI or visual polish changes, do not claim completion until you have personally reviewed fresh screenshots or live Chrome MCP output from the changed surface. If the user is asking about layout/styling, include those screenshots in the handoff.
- When presenting completed work to the user for repo code changes or app-behavior changes, build a fresh mac app artifact with `npm run package:mac` and report the resulting `.app` and `.zip` paths in the handoff.
- Do not run `npm run package:mac` for Paper MCP-only work, design-only tasks, copy-only tasks, or other requests that do not change the app code in this repository.


## Paper Safety Rules
- Never delete anything from Paper.
- Never delete, remove, or replace an artboard in Paper, even if the agent created it earlier in the session.
- Treat all existing Paper artboards and nodes as user-owned unless the user explicitly asks to edit that exact artifact.
- When the user asks for a new Paper artifact, create a new artboard from scratch instead of duplicating or modifying an existing one.
- When a Paper design needs revision, duplicate, rename, or create a new artboard/node instead of deleting an existing one.
- If an incorrect Paper artifact is created, leave it in place and add the corrected version separately.
