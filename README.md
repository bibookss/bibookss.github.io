# Albert Perez's portfolio

A quiet, text-first portfolio with animated pixel plumbing in the margins. Plain HTML, CSS, and JavaScript, with no build step or runtime dependencies.

## Run locally

From this directory:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173.

## Edit

- `dist/index.html`: portfolio content, navigation, and project details.
- `dist/styles.css`: layout, colors, responsive styling, and dark theme.
- `dist/script.js`: canvas pipes, animation controls, and theme preferences.
- `dist/assets/albert-perez-resume.pdf`: downloadable resume.

The canvas is decorative and doesn't capture pointer events. Animation respects reduced-motion preferences and stops when the tab is hidden. Theme and animation preferences are stored locally. Content, anchor navigation, project details, and the resume also work without JavaScript.

Content is based on the supplied resume. The personal data warehouse's source URL returned 404 when checked, so the project has an inline architecture breakdown instead of an unavailable repository link. Add the repository link once it is public.

## Hosting

Serve `dist/` with any static host. The Sites project identity lives in `.openai/hosting.json`. Update the `og:url` metadata if moving to a different domain.

Design reference: [Kevin Amparado's Hugo Bear portfolio](https://kevinamparado.com/). Original markup, styling, and pixel pipeline illustration.
