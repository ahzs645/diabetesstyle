# DiabetesStyle

A standalone React/Vite recreation of LibreView-style glucose reports. It accepts Arabic or English LibreView CSV exports, calculates report statistics in the browser, and renders nine printable report sections in Arabic or English.

## Privacy

Uploaded CSV files are parsed entirely in the browser. Patient data is not sent to a server, and no real patient CSV or PDF is committed to this repository.

## Local development

```bash
npm install
npm run dev
```

## GitHub Pages

Pushes to `main` are built and deployed by `.github/workflows/deploy-pages.yml`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
