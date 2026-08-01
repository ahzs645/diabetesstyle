# DiabetesStyle

A standalone React/Vite recreation of LibreView-style glucose reports. It accepts Arabic or English LibreView CSV exports, calculates report statistics in the browser, and renders eleven printable report sections in Arabic or English — including an Estimated A1C explainer that walks through the ADAG/GMI equations step by step on the loaded data and charts the value's progression through the dataset.

## Data sources and separate-source mode

A LibreView account merges every app instance that ever uploaded to it: a new
phone, an app reinstall or a second reader each appear under their own serial
number. The LibreLink app on a phone is different — it computes its screens
from its own local database, so a freshly set-up instance averages only the
few days it has while still heading the report with the nominal window ("last
90 days"). The number on the phone then cannot be reproduced from the merged
export, and it looks like a glycemic change when it is really a change of
phone.

Two features make that visible:

- **Data Sources report** — a coverage timeline of every source across the
  dataset, and a table giving the merged value for the selected period next to
  the value each source alone would have shown, with how much of the period it
  actually covers. Sources backing less than 70% of the period are flagged.
- **Separate-source mode** — the toolbar's *Source* picker (shown only when an
  export has more than one) narrows every report to a single instance, so the
  whole report set renders exactly what that phone could have produced. A
  banner marks the reports while it is on, and it stays on printouts.

The Estimated A1C report also carries a coverage caveat whenever the value is
backed by less than 70% of the days it is labelled with. It is worded and
measured to match the caveat the LibreLink app prints under its own Estimated
A1C — "مدى البيانات 7 من 90 أيام" / "Data range 7 of 90 days" — so the two can
be read side by side, with the share of expected readings added after it.

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
