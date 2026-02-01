# Bring your own backend - TODO Frontend

Companion of the [BYOB TODO backend](https://github.com/sverhoeven/byob-todo-backend).

## Usage

```bash
# Install dependencies
bun i
# Start development server
bun dev
# Bundle to dist/ directory
bun run build
# Regenerate API types
bun regen:api
# Typecheck
bun typecheck
# Lint, format, and sort imports and apply all fixes
bun biome check --write
# Check only (no fixes)
bun biome check
```
