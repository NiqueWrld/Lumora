# React + TypeScript Template

A production-ready React template with routing, authentication, theming, and a responsive layout — built with Vite, TypeScript, Tailwind CSS v4, and Phosphor Icons.

## Stack

- **React 19** + **TypeScript** — with `erasableSyntaxOnly` and `verbatimModuleSyntax` enabled
- **Vite 8** — fast dev server and build
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin
- **React Router DOM v7** — client-side routing
- **Phosphor Icons** — icon library (`@phosphor-icons/react`)

## Features

- Auth context (`AuthContext`) with login/logout
- Theme context (`ThemeContext`) with dark mode, persisted in `localStorage`
- Responsive layout — sidebar + header + main + footer
- Sidebar with active link highlighting, user badge, and logout
- Pages: Home, Login, Register, Dashboard, Profile, Settings
- `MetricCards` component — supply data only, no layout logic needed
- Centralized route constants (`src/lib/routes.ts`)
- App constants (`src/lib/constants.ts`) — app name, logo path

## Project Structure

```
src/
  components/
    Layout/         # Header, Sidebar, Footer, Layout wrapper
    MetricCards.tsx # Dashboard stat cards component
  context/
    AuthContext.tsx  # Authentication state
    ThemeContext.tsx # Dark/light theme state
  lib/
    constants.ts    # APP_NAME, APP_LOGO
    routes.ts       # ROUTES constants
  pages/
    Auth/           # Login, Register, Profile, Settings
    User/           # User Dashboard
    Dashboard.tsx   # Role-based dashboard router
    index.tsx       # Home / landing page
  types/
    User.ts         # User interface, Role const
```

## Getting Started

```bash
pnpm install
pnpm dev
```

## Adding a New Page

1. Create the page in `src/pages/`
2. Add the route to `src/lib/routes.ts`
3. Add the route to `src/App.tsx`
4. Add a nav link to `src/components/Layout/Sidebar.tsx`

## Constants

### `src/lib/constants.ts`

Holds global app-level values used across components.

```ts
export const APP_NAME = 'My App';   // displayed in Header, Sidebar, Footer
export const APP_LOGO = '/logo.svg'; // path relative to /public
```

Import and use anywhere:

```ts
import { APP_NAME, APP_LOGO } from '@/lib/constants';
```

### `src/lib/routes.ts`

Centralized route paths — prevents hardcoded strings throughout the app.

```ts
export const ROUTES = {
  HOME:      '/',
  LOGIN:     '/login',
  REGISTER:  '/register',
  DASHBOARD: '/dashboard',
  PROFILE:   '/profile',
  SETTINGS:  '/settings',
} as const;
```

Import and use anywhere:

```ts
import { ROUTES } from '@/lib/routes';

<Link to={ROUTES.DASHBOARD}>Dashboard</Link>
navigate(ROUTES.LOGIN);
```

When adding a new route, add it to `ROUTES` first, then reference the constant in `App.tsx` and `Sidebar.tsx`.

## Customization

- Change app name and logo in `src/lib/constants.ts`
- Replace the default user in `src/context/AuthContext.tsx` with a real API call

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
