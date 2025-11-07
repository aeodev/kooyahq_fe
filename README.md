# KooyaHQ Frontend

React + TypeScript application driving the KooyaHQ workspace experience.

## Stack

- React with Strict Mode
- Vite dev/build tooling
- Utility-first design tokens powered by CSS variables
- TypeScript (strict mode) with `@/*` path aliases

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173) by default. The CTA on the home page assumes the backend health route is exposed at `/api/health`.

## Project structure

```
src/
  components/
    layout/        # Layouts and shells
    theme/         # Theme-related UI helpers
    ui/            # Shared UI primitives
  hooks/           # Shared React hooks (theme, auth, data fetching)
  pages/           # Route-level pages
  utils/           # Reusable utilities (e.g., className merging, API routes)
```

Design tokens live in `tailwind.config.js` and map to CSS variables defined in `src/index.css` for consistent theming across KooyaHQ modules.
