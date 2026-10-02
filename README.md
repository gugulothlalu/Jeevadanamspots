# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
---

## JEEVADANAM — 8-SECOND 3D OPENING VIDEO

### Files

1. `App.jsx` → existing `src/App.jsx` file
2. `App.css` → existing `src/App.css` file
3. `public/jeevadanam-opening-8s.mp4` → project's `public/` folder

### Opening behavior

- Uses the uploaded video starting at 00:02.
- Keeps 00:02 through 00:10, giving an 8-second opening.
- Shows on every fresh page load/refresh because no storage flag is used.
- Muted + playsInline for browser/mobile autoplay compatibility.
- App continues automatically when the 8-second video ends.
- If the video cannot load, the intro closes instead of trapping the site.

### Note

No other application logic was intentionally changed.