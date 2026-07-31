# DiabetesStyle

A standalone React/Vite recreation of LibreView-style glucose reports. It accepts Arabic or English LibreView CSV exports, calculates report statistics in the browser, and renders ten printable report sections in Arabic or English — including an Estimated A1C explainer that walks through the ADAG/GMI equations step by step on the loaded data and charts the value's progression through the dataset.

## Privacy

Uploaded CSV files are parsed entirely in the browser. Patient data is not sent to a server, and no real patient CSV or PDF is committed to this repository.

## Local development

```bash
npm install
npm run dev
```

## Optional: date of birth field

The patient date-of-birth field is excluded by default — no toolbar picker,
no header line, and the `?dob=` URL parameter is ignored. To include it, set
the env flag at build (or dev) time:

```bash
VITE_SHOW_DOB=true npm run build
```

With the flag on, the toolbar shows a DOB picker, the report header prints
the DOB line, and `?dob=DD/MM/YYYY` in the page URL prefills it.

## GitHub Pages

Pushes to `main` are built and deployed by `.github/workflows/deploy-pages.yml`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
