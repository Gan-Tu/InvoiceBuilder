import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Compile just the data modules into an isolated temporary ESM directory.
const dir = await mkdtemp(join(tmpdir(), 'invoice-data-tests-'))
await writeFile(join(dir, 'package.json'), '{"type":"module"}')
await symlink(resolve('node_modules'), join(dir, 'node_modules'))
for (const name of ['storage', 'prefill', 'normalize', 'defaults', 'dates']) {
  const source = await readFile(`src/lib/${name}.ts`, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '(\.\/[^']+?)(?<!\.js)'/g, "from '$1.js'")
  await writeFile(join(dir, `${name}.js`), compiled)
}
const { saveInvoice, loadSavedInvoice, loadInitial, SAVED_COOKIE } = await import(pathToFileURL(join(dir, 'storage.js')))
const { applyQueryPrefill } = await import(pathToFileURL(join(dir, 'prefill.js')))
const { sampleInvoice } = await import(pathToFileURL(join(dir, 'defaults.js')))

function memoryStorage() {
  const data = new Map()
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    get length() { return data.size },
    key: index => [...data.keys()][index] ?? null,
    clear: () => data.clear(),
    data,
  }
}
function cookieDocument({ blocked = false, header = '' } = {}) {
  let cookies = header
  return {
    location: { protocol: 'https:' },
    lastWrite: '',
    get cookie() { return cookies },
    set cookie(value) {
      this.lastWrite = value
      if (!blocked) cookies = value.split(';')[0]
    },
  }
}
const base = sampleInvoice()
const storage = memoryStorage()
const doc = cookieDocument()
const saved = { ...base, number: 'INV-SAVED', items: [] }
saveInvoice(saved, doc, storage)
assert.deepEqual(loadSavedInvoice(doc.cookie, storage, base), saved, 'empty item arrays round trip')
assert.match(doc.lastWrite, /Max-Age=31536000; Path=\/; SameSite=Lax; Secure$/)
assert.ok(doc.cookie.startsWith(`${SAVED_COOKIE}=`))
assert.equal(storage.length, 0, 'ordinary fields saved directly in cookie')

globalThis.document = doc
globalThis.localStorage = storage
globalThis.window = { location: { search: '' } }
storage.setItem('invoice:v1', JSON.stringify({ ...base, number: 'UNSAVED' }))
assert.equal(loadInitial().invoice.number, 'INV-SAVED', 'saved snapshot takes priority over draft')
storage.setItem('invoice:v1', 'invalid draft')
assert.equal(loadInitial().invoice.number, 'INV-SAVED', 'malformed draft cannot discard a valid saved cookie')
globalThis.window.location.search = '?number=URL-OVERRIDE&from.name=Query%20Business'
const initial = loadInitial()
assert.equal(initial.invoice.number, 'URL-OVERRIDE')
assert.equal(initial.invoice.from.name, 'Query Business')
assert.equal(initial.invoice.from.email, saved.from.email)

assert.equal(loadSavedInvoice(`${SAVED_COOKIE}=%invalid`, storage, base), null)
assert.equal(loadSavedInvoice(`${SAVED_COOKIE}=${encodeURIComponent(JSON.stringify({ v: 1, invoice: { items: [{}] } }))}`, storage, base), null)
assert.equal(loadSavedInvoice(`${SAVED_COOKIE}=${encodeURIComponent(JSON.stringify({ v: 1, storageKey: 'other-app-data' }))}`, storage, base), null)
assert.throws(() => saveInvoice(base, cookieDocument({ blocked: true }), storage), /Allow cookies/)
assert.throws(() => saveInvoice(base, cookieDocument({ header: `other=${'x'.repeat(7800)}` }), storage), /too many cookies/)

const logoInvoice = { ...base, logo: { src: `data:image/png;base64,${'a'.repeat(10000)}`, width: 200, height: 80 } }
const logoDoc = cookieDocument()
const logoStorage = memoryStorage()
saveInvoice(logoInvoice, logoDoc, logoStorage)
assert.ok(logoDoc.cookie.length < 4000)
assert.equal(logoStorage.length, 1)
assert.deepEqual(loadSavedInvoice(logoDoc.cookie, logoStorage, base), logoInvoice)
const firstSnapshot = logoDoc.cookie
assert.throws(() => saveInvoice({ ...logoInvoice, number: 'REJECTED' }, cookieDocument({ blocked: true, header: firstSnapshot }), logoStorage), /Allow cookies/)
assert.deepEqual(loadSavedInvoice(firstSnapshot, logoStorage, base), logoInvoice, 'failed saves preserve previous logo')
assert.equal(logoStorage.length, 1, 'failed snapshots cleaned up')
saveInvoice({ ...base, logo: null }, logoDoc, logoStorage)
assert.equal(logoStorage.length, 0, 'replaced logo cleaned up')
assert.equal(loadSavedInvoice(logoDoc.cookie, logoStorage, base).logo, null)

const largeInvoice = { ...logoInvoice, notes: '長いメモ '.repeat(2000) }
saveInvoice(largeInvoice, logoDoc, logoStorage)
assert.ok(logoDoc.cookie.length < 1000, 'large snapshot uses small cookie pointer')
assert.equal(logoStorage.length, 1, 'large snapshot includes logo without duplicate blob')
assert.deepEqual(loadSavedInvoice(logoDoc.cookie, logoStorage, base), largeInvoice)
const failingStorage = { ...memoryStorage(), setItem() { throw new Error('quota') } }
assert.throws(() => saveInvoice(largeInvoice, cookieDocument(), failingStorage), /storage may be full/)

const query = new URLSearchParams({
  invoice: JSON.stringify({ number: 'INV-42', from: { name: 'JSON Business' }, items: [{ description: 'Hosting', quantity: 1, unitPrice: 49 }] }),
  number: 'FIELD-WINS',
  'from.email': 'billing@example.com',
})
const prefill = applyQueryPrefill(base, query)
assert.equal(prefill.error, null)
assert.equal(prefill.invoice.number, 'FIELD-WINS')
assert.equal(prefill.invoice.from.name, 'JSON Business')
assert.equal(prefill.invoice.from.email, 'billing@example.com')
assert.equal(prefill.invoice.from.address, base.from.address)
assert.equal(prefill.invoice.items[0].quantity, '1')
assert.equal(prefill.invoice.items[0].unitPrice, '49')
assert.equal(applyQueryPrefill(base, '?items=%5B%5D').invoice.items.length, 0)
assert.equal(applyQueryPrefill(base, '?from.name=A%20%26%20B').invoice.from.name, 'A & B')
assert.equal(applyQueryPrefill(base, '?unrelated=value').applied, false)
for (const search of ['?invoice=not-json', '?invoice=[]', '?items={}', '?items=[null]']) {
  const invalid = applyQueryPrefill(base, search)
  assert.ok(invalid.error)
  assert.equal(invalid.invoice, base, 'invalid payload leaves base unchanged')
}
console.log('Invoice prefill and saved-cookie regression tests passed.')
