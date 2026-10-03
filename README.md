# Invoice Builder

A small, fast web app for producing clean, Stripe-style invoices as real vector PDFs.

- Live preview that is the PDF: the invoice is described once and rendered both to the DOM (preview) and to PDF through the same component tree, so what you see is what you download.
- Real PDF output via `@react-pdf/renderer` with embedded Inter, selectable text, and automatic pagination with repeating footer and page numbers.
- Logo upload (PNG, JPG, SVG), accent color, Letter or A4, 18 currencies, tax and discount, paid or due status.
- Everything autosaves to the browser. No server, no accounts, nothing leaves your machine.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. `⌘S` (or `Ctrl+S`) downloads the PDF.

## API

`POST /api/invoice` takes a JSON body and returns a PDF. Every field is optional, and any section you leave out is left out of the PDF (no logo, no "Bill to", no notes, no tax line, and so on). Numbers can be numbers or numeric strings.

```bash
curl -X POST http://invoice.tugan.app/api/invoice \
  -H 'content-type: application/json' \
  -o INV-0042.pdf \
  -d '{
    "number": "INV-0042",
    "issueDate": "2026-10-03",
    "dueDate": "2026-10-17",
    "currency": "USD",
    "from": { "name": "Northwind Studio", "email": "billing@northwind.studio", "address": ["1 Market Street", "San Francisco, CA 94105"] },
    "to": { "name": "Acme Corporation", "email": "accounts@acme.com" },
    "items": [
      { "description": "Product design", "quantity": 40, "unitPrice": 150 },
      { "description": "Hosting", "quantity": 1, "unitPrice": 49 }
    ],
    "taxRate": 8.5,
    "discount": 0,
    "credit": 0,
    "notes": "Thank you for your business."
  }'
```

| Field | Type | Notes |
| --- | --- | --- |
| `number` | string | Invoice number |
| `issueDate`, `dueDate` | string | `YYYY-MM-DD`. No due date reads as "due on receipt". |
| `currency` | string | ISO 4217 code, default `USD` |
| `status` | `"unpaid"` or `"paid"` | Paid invoices get a Paid badge and "Amount paid" |
| `accent` | string | Hex color for the top bar |
| `pageSize` | `"LETTER"` or `"A4"` | |
| `from`, `to` | object | `{ name, email, address }`. `address` may be a string with newlines or an array of lines. |
| `items` | array | `{ description, quantity, unitPrice }` |
| `taxRate`, `discount` | number | Percent |
| `credit` | number | Fixed amount already paid, subtracted from the total |
| `notes` | string or array | Shown under the totals |
| `logo` | string or object | PNG or JPEG as a base64 data URL, an http(s) URL, or `{ src, width, height }` |

`GET /api/invoice` returns this field list and an example payload. Add `?download=1` to the POST to get a `Content-Disposition: attachment` response. The same endpoint runs locally under `npm run dev`.

## Deploy to Vercel

The repo is ready for a Vercel import: the Vite app builds to `dist/` and `api/invoice.ts` becomes a Node.js function. `vercel.json` makes sure the Inter font files ship with the function. Nothing else to configure.

```bash
npx vercel
```

## Build

```bash
npm run build
```

The static output lands in `dist/`.

## Layout of the code

| Path | What it does |
| --- | --- |
| `src/invoice/layout.tsx` | The invoice itself, written once against three primitives (`View`, `Text`, `Image`). All sizes are in points. |
| `src/invoice/dom.tsx` | Renders the layout to HTML for the live preview. |
| `src/invoice/document.tsx` | The react-pdf `Document` built from the shared layout. Used by both the browser download and the API. |
| `src/invoice/pdf.tsx` | Browser-side PDF export. Registers Inter via Vite asset URLs and is loaded lazily on first download. |
| `api/invoice.ts` | The HTTP API. A Vercel Node.js function, also served by the Vite dev server. |
| `src/lib/normalize.ts` | Turns a loose JSON payload into a complete invoice. |
| `src/components/` | Editor form, line items, logo upload, preview pane, UI primitives. |
| `src/lib/` | Money and date formatting, totals, sample data, local storage. |
