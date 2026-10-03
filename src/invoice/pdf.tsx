import { Font, pdf } from '@react-pdf/renderer'
import type { Invoice } from '../types'
import { InvoiceDocument } from './document'
import interRegular from '../assets/fonts/Inter-Regular.ttf?url'
import interMedium from '../assets/fonts/Inter-Medium.ttf?url'
import interSemiBold from '../assets/fonts/Inter-SemiBold.ttf?url'

Font.register({
  family: 'Inter',
  fonts: [
    { src: interRegular, fontWeight: 400 },
    { src: interMedium, fontWeight: 500 },
    { src: interSemiBold, fontWeight: 600 },
  ],
})

// Never hyphenate: invoices should read exactly as typed.
Font.registerHyphenationCallback((word) => [word])

export async function renderInvoicePdf(invoice: Invoice): Promise<Blob> {
  return pdf(<InvoiceDocument invoice={invoice} />).toBlob()
}
