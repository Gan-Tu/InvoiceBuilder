import { createElement, type ReactElement } from 'react'
import path from 'node:path'
import { Font, renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { InvoiceDocument, pdfFileName } from '../src/invoice/document'
import { normalizeInvoice } from '../src/lib/normalize'
import { imageSize } from '../src/lib/image-size'
import type { Logo } from '../src/types'

/**
 * POST /api/invoice  — JSON in, PDF out.
 *
 * Every field is optional; sections that are not supplied are left out of the PDF.
 * Runs as a Vercel Node.js function in production and through the Vite dev server locally.
 */

const FONT_DIR = path.join(process.cwd(), 'src', 'assets', 'fonts')

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FONT_DIR, 'Inter-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'Inter-Medium.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'Inter-SemiBold.ttf'), fontWeight: 600 },
  ],
})
Font.registerHyphenationCallback((word) => [word])

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  })
}

/** Accepts a data URL, an http(s) URL, or `{ src, width, height }` and returns a sized logo. */
async function resolveLogo(raw: unknown): Promise<Logo | null> {
  if (!raw) return null
  if (typeof raw === 'object' && raw !== null && 'src' in raw) {
    const d = raw as Record<string, unknown>
    if (typeof d.src === 'string' && Number(d.width) > 0 && Number(d.height) > 0) {
      return { src: d.src, width: Number(d.width), height: Number(d.height) }
    }
    raw = d.src
  }
  if (typeof raw !== 'string') return null

  let bytes: Uint8Array
  if (raw.startsWith('data:')) {
    const m = /^data:image\/[\w.+-]+;base64,(.+)$/is.exec(raw)
    if (!m) throw new ApiError(400, 'logo must be a base64 data URL, an http(s) URL, or { src, width, height }')
    bytes = Buffer.from(m[1], 'base64')
  } else if (/^https?:\/\//i.test(raw)) {
    const res = await fetch(raw, { signal: AbortSignal.timeout(8000) }).catch(() => null)
    if (!res || !res.ok) throw new ApiError(400, `Could not fetch logo from ${raw}`)
    const ab = await res.arrayBuffer()
    if (ab.byteLength > MAX_LOGO_BYTES) throw new ApiError(400, 'Logo must be under 5 MB')
    bytes = new Uint8Array(ab)
  } else {
    throw new ApiError(400, 'logo must be a base64 data URL, an http(s) URL, or { src, width, height }')
  }
  if (bytes.byteLength > MAX_LOGO_BYTES) throw new ApiError(400, 'Logo must be under 5 MB')

  const size = imageSize(bytes)
  if (!size) throw new ApiError(400, 'Logo must be a PNG or JPEG image')
  const mime = size.type === 'png' ? 'image/png' : 'image/jpeg'
  return { src: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`, width: size.width, height: size.height }
}

export async function POST(request: Request): Promise<Response> {
  try {
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      throw new ApiError(400, 'Request body must be JSON')
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw new ApiError(400, 'Request body must be a JSON object')
    }

    const body = payload as Record<string, unknown>
    const logo = await resolveLogo(body.logo)
    const invoice = normalizeInvoice({ ...body, logo })

    const element = createElement(InvoiceDocument, { invoice }) as unknown as ReactElement<DocumentProps>
    const pdf = await renderToBuffer(element)
    const url = new URL(request.url)
    const disposition = url.searchParams.has('download') ? 'attachment' : 'inline'

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(pdf.byteLength),
        'content-disposition': `${disposition}; filename="${pdfFileName(invoice.number)}"`,
        'cache-control': 'no-store',
        ...CORS,
      },
    })
  } catch (err) {
    if (err instanceof ApiError) return json({ error: err.message }, err.status)
    console.error(err)
    return json({ error: 'Failed to render the invoice' }, 500)
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS })
}

export function GET(): Response {
  return json({
    name: 'Invoice Builder API',
    usage: 'POST a JSON body to this endpoint and receive a PDF. Add ?download=1 for an attachment. Every field is optional; omitted sections are left out of the PDF.',
    fields: {
      number: 'string — invoice number, e.g. "INV-0042"',
      issueDate: 'string — YYYY-MM-DD',
      dueDate: 'string — YYYY-MM-DD. Omit for "due on receipt".',
      currency: 'string — ISO 4217 code, default "USD"',
      status: '"unpaid" | "paid"',
      accent: 'string — hex color for the top bar, default "#635bff"',
      pageSize: '"LETTER" | "A4"',
      from: '{ name, email, address } — address may be a string with newlines or an array of lines',
      to: '{ name, email, address }',
      items: '[{ description, quantity, unitPrice }] — numbers or numeric strings',
      taxRate: 'number — percent',
      discount: 'number — percent',
      credit: 'number — fixed amount already paid, subtracted from the total',
      notes: 'string or array of lines',
      logo: 'PNG/JPEG as a base64 data URL, an http(s) URL, or { src, width, height }',
    },
    example: {
      number: 'INV-0042',
      issueDate: '2026-10-03',
      dueDate: '2026-10-17',
      currency: 'USD',
      from: { name: 'Northwind Studio', email: 'billing@northwind.studio', address: ['1 Market Street, Suite 400', 'San Francisco, CA 94105'] },
      to: { name: 'Acme Corporation', email: 'accounts@acme.com' },
      items: [
        { description: 'Product design — October sprint', quantity: 40, unitPrice: 150 },
        { description: 'Hosting and maintenance', quantity: 1, unitPrice: 49 },
      ],
      taxRate: 8.5,
      notes: 'Thank you for your business.',
    },
  })
}
