# Invoice Builder

A small, fast web app for producing clean, Stripe-style invoices as real vector PDFs.

- Live preview that is the PDF: the invoice is described once and rendered both to the DOM (preview) and to PDF through the same component tree, so what you see is what you download.
- Real PDF output via `@react-pdf/renderer` with embedded Inter, selectable text, and automatic pagination with repeating footer and page numbers.
- Logo upload (PNG, JPG, SVG), accent color, Letter or A4, 18 currencies, tax and discount, paid or due status.
- URL query parameters prefill the editor; Save remembers invoice data in this browser's cookies. No accounts are required.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. `⌘S` (or `Ctrl+S`) downloads the PDF.

## Prefill the editor with a URL

Open the app with individual query parameters, for example:

[Prefill invoice number and customer](https://invoice.tugan.app/?number=INV-0042&to.name=Acme%20Corporation&to.email=accounts%40acme.com)

| Parameter | Value |
| --- | --- |
| `number`, `issueDate`, `dueDate`, `currency`, `status`, `accent`, `pageSize` | Same values as the API fields below. Dates use `YYYY-MM-DD`; encode `#` in colors as `%23`. |
| `from.name`, `from.email`, `from.address`, `to.name`, `to.email`, `to.address` | Business and customer details. Encode address line breaks as `%0A`. |
| `taxRate`, `discount`, `credit`, `notes` | Numbers or text, as in the API. |
| `items` | URL-encoded JSON array of `{ description, quantity, unitPrice }`. Replaces all line items. |
| `invoice` | URL-encoded JSON object using the API shape. Supports nested parties, address arrays, items, and other API fields. |

The API aliases (such as `invoiceNumber`, `paper`, and `lineItems`) also work. Within `invoice` JSON, `sender`/`business` and `client`/`customer`/`billTo` are aliases for the parties. Unknown parameters are ignored. Malformed invoice or items JSON shows an error and leaves the existing invoice intact.

The app starts with your explicitly saved invoice, or an automatically saved browser draft if you have never clicked Save, or the sample invoice. The URL's `invoice` JSON overlays that starting data, then individual query parameters take precedence. Only supplied fields change, including within `from` and `to`; an empty text parameter clears that field. Opening a URL does not replace your explicitly saved invoice automatically.

Build correctly encoded links with `URLSearchParams`:

```js
const invoice = {
  number: 'INV-0042',
  from: { name: 'Northwind Studio', email: 'billing@northwind.studio' },
  to: { name: 'Acme Corporation', email: 'accounts@acme.com' },
  items: [{ description: 'Product design', quantity: 40, unitPrice: 150 }],
  taxRate: 8.5,
}
const url = new URL('https://invoice.tugan.app/')
url.search = new URLSearchParams({ invoice: JSON.stringify(invoice) }).toString()
console.log(url.href)
```

[Open the full INV-0042 example](https://invoice.tugan.app/?invoice=%7B%22number%22%3A%22INV-0042%22%2C%22issueDate%22%3A%222026-10-03%22%2C%22dueDate%22%3A%222026-10-17%22%2C%22currency%22%3A%22USD%22%2C%22from%22%3A%7B%22name%22%3A%22Northwind+Studio%22%2C%22email%22%3A%22billing%40northwind.studio%22%2C%22address%22%3A%5B%221+Market+Street%22%2C%22San+Francisco%2C+CA+94105%22%5D%7D%2C%22to%22%3A%7B%22name%22%3A%22Acme+Corporation%22%2C%22email%22%3A%22accounts%40acme.com%22%7D%2C%22items%22%3A%5B%7B%22description%22%3A%22Product+design%22%2C%22quantity%22%3A40%2C%22unitPrice%22%3A150%7D%2C%7B%22description%22%3A%22Hosting%22%2C%22quantity%22%3A1%2C%22unitPrice%22%3A49%7D%5D%2C%22taxRate%22%3A8.5%2C%22discount%22%3A0%2C%22credit%22%3A0%2C%22notes%22%3A%22Thank+you+for+your+business.%22%7D)

## Save invoice data

Click **Save** to remember the current form, including values prefilled from a URL. The next visit to the app in the same browser restores those values. Edits also autosave as a local browser draft, but once you explicitly save an invoice, that saved version takes precedence on the next visit. Click Save again to replace it. **Download PDF** and `⌘S`/`Ctrl+S` export the PDF separately.

Saved invoice data normally uses cookies that last one year. Logos are saved separately in browser local storage; invoices too large for cookies also use local storage with a cookie pointing to them. Clearing this site's cookies/storage removes saved data. URL parameters override saved values for the current visit; click Save to keep those overrides for future visits without query parameters.

## API

`POST /api/invoice` takes a JSON body and returns a PDF. Every field is optional, and any section you leave out is left out of the PDF (no logo, no "Bill to", no notes, no tax line, and so on). Numbers can be numbers or numeric strings.

```bash
curl --fail-with-body -X POST https://invoice.tugan.app/api/invoice \
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

The repo is ready for a Vercel import: the Vite app builds to `dist/` and `npm run build:api` bundles the shared invoice code into `.server/invoice.mjs`; `api/invoice.mjs` exposes it as a Node.js function. `vercel.json` makes sure the Inter font files ship with the function. Nothing else to configure.

```bash
npx vercel
```

## Test

```bash
npm test
```

Regression checks cover URL prefilling, saved-cookie restoration, storage failures, and large invoice/logo persistence.

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
| `src/server/invoice.ts` | The HTTP API, served directly by Vite during development. |
| `scripts/build-api.mjs` | Bundles the API and shared invoice layout into `.server/invoice.mjs` for Vercel, avoiding runtime TypeScript/TSX imports. |
| `src/lib/normalize.ts` | Turns a loose JSON payload into a complete invoice. |
| `src/components/` | Editor form, line items, logo upload, preview pane, UI primitives. |
| `src/lib/` | Money and date formatting, totals, sample data, local storage. |
