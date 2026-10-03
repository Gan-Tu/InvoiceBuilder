import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import type { Invoice } from '../types'
import { BODY_FONT_SIZE, INK, InvoiceLayout, LINE_HEIGHT, PAGE_PADDING, type Primitives } from './layout'

/**
 * The react-pdf document. Shared by the browser download and the HTTP API; each of those
 * registers the Inter font in the way that suits its environment before rendering this.
 */

const pdfPrimitives: Primitives = {
  View: View as unknown as Primitives['View'],
  Text: Text as unknown as Primitives['Text'],
  Image: Image as unknown as Primitives['Image'],
}

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  return (
    <Document
      title={invoice.number ? `Invoice ${invoice.number}` : 'Invoice'}
      author={invoice.from.name || undefined}
      subject={invoice.to.name ? `Invoice for ${invoice.to.name}` : undefined}
      creator="Invoice Builder"
      producer="Invoice Builder"
    >
      <Page
        size={invoice.pageSize}
        style={{
          paddingTop: PAGE_PADDING.top,
          paddingHorizontal: PAGE_PADDING.x,
          paddingBottom: PAGE_PADDING.bottom,
          fontFamily: 'Inter',
          fontSize: BODY_FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          color: INK,
        }}
      >
        <InvoiceLayout invoice={invoice} P={pdfPrimitives} target="pdf" />
      </Page>
    </Document>
  )
}

export function pdfFileName(number: string): string {
  const safe = number.trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${safe || 'invoice'}.pdf`
}
