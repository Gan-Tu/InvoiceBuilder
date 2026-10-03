export type Party = {
  name: string
  email: string
  address: string
}

export type LineItem = {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

export type Logo = {
  src: string
  width: number
  height: number
}

export type PageSize = 'LETTER' | 'A4'
export type Status = 'unpaid' | 'paid'

export type Invoice = {
  number: string
  issueDate: string
  dueDate: string
  currency: string
  status: Status
  accent: string
  pageSize: PageSize
  from: Party
  to: Party
  items: LineItem[]
  taxRate: string
  discount: string
  credit: string
  notes: string
  logo: Logo | null
}
