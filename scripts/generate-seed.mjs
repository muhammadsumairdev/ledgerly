/**
 * Seed generator for Ledgerly. Produces src/seed/{clients,invoices,settings}.json.
 *
 * Anchored to a fixed "today" so the committed data is stable in git and the
 * dashboard's last-6-months charts / status mix look busy and alive. Re-run with
 * `npm run seed` to refresh relative to a new anchor. Uses a seeded PRNG so
 * output is deterministic (no noisy diffs).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'seed')
mkdirSync(OUT, { recursive: true })

const ANCHOR = new Date('2026-07-17T12:00:00Z')

// --- seeded PRNG (mulberry32) ---------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260717)
const rand = (min, max) => min + rng() * (max - min)
const int = (min, max) => Math.floor(rand(min, max + 1))
const pick = (arr) => arr[int(0, arr.length - 1)]
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// --- date helpers ----------------------------------------------------------
const iso = (d) => d.toISOString().slice(0, 10)
function addDays(base, days) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}
// N months before the anchor, on a given day-of-month.
function monthsAgo(offset, day) {
  const d = new Date(Date.UTC(ANCHOR.getUTCFullYear(), ANCHOR.getUTCMonth() - offset, day, 12))
  return d
}

// --- clients ---------------------------------------------------------------
const CLIENTS = [
  ['Ava Bennett', 'Brightwave Media', 'ava@brightwave.io', '240 Larkspur Ave\nAustin, TX 78702', 5],
  ['Marcus Cole', 'Northloop Robotics', 'marcus@northloop.dev', '1100 Rialto St, Fl 6\nDenver, CO 80202', 12],
  ['Priya Nair', 'Verdant Interiors', 'priya@verdant.design', '58 Camden High St\nPortland, OR 97209', 32],
  ['Diego Ramos', 'Solstice Coffee Co.', 'diego@solsticecoffee.com', '7 Marina Blvd\nSan Diego, CA 92101', 15],
  ['Hannah Frost', 'Frostline Apparel', 'hannah@frostline.co', '19 Birchwood Ln\nMinneapolis, MN 55401', 45],
  ['Leo Whitfield', 'Whitfield & Grey Law', 'leo@whitfieldgrey.com', '400 Court Sq, Suite 22\nRichmond, VA 23219', 60],
  ['Sara Okafor', 'Pulse Fitness Group', 'sara@pulsefit.com', '88 Harbor Point\nMiami, FL 33131', 20],
  ['Tomás Herrera', 'Cedar & Stone Build', 'tomas@cedarstone.build', '512 Foundry Rd\nNashville, TN 37203', 51],
  ['Nadia Haddad', 'Lumen Health Labs', 'nadia@lumenlabs.io', '3 Beacon Way\nBoston, MA 02108', 26],
  ['Owen Clarke', 'Trailhead Outdoors', 'owen@trailhead.co', '210 Ridgeway Dr\nBoulder, CO 80301', 68],
  ['Mei Tanaka', 'Origami Studio', 'mei@origami.studio', '61 Kite St\nSeattle, WA 98109', 44],
  ['Isabel Moreno', 'Saffron Kitchen', 'isabel@saffronkitchen.com', '9 Vine Terrace\nCharleston, SC 29401', 9],
].map(([name, company, email, address, img], i) => ({
  id: `cl${i + 1}`,
  name,
  company,
  email,
  address,
  avatar: `https://i.pravatar.cc/150?img=${img}`,
}))

// --- line-item catalogue ---------------------------------------------------
const CATALOG = [
  ['Brand identity design', 1400, 3200],
  ['Website design (per page)', 480, 950],
  ['Front-end development', 85, 145], // hourly
  ['UX research session', 600, 1200],
  ['Logo & mark exploration', 900, 1800],
  ['Monthly retainer', 2200, 4800],
  ['Copywriting', 320, 720],
  ['Photography day rate', 1100, 1900],
  ['SEO audit', 750, 1500],
  ['Marketing consultation', 120, 220], // hourly
  ['Illustration set', 540, 1250],
  ['Print production', 260, 880],
]

function makeLineItems() {
  const n = int(1, 4)
  const chosen = new Set()
  const items = []
  for (let i = 0; i < n; i++) {
    let c = pick(CATALOG)
    let guard = 0
    while (chosen.has(c[0]) && guard++ < 6) c = pick(CATALOG)
    chosen.add(c[0])
    const hourly = c[2] < 250
    const qty = hourly ? int(6, 40) : int(1, 4)
    const rate = round2(rand(c[1], c[2]) / (hourly ? 1 : 1))
    items.push({
      id: `li_${Math.floor(rng() * 1e9).toString(36)}`,
      description: c[0],
      qty,
      rate: Math.round(rate),
      taxable: rng() > 0.15,
    })
  }
  return items
}

const TERMS_DAYS = [15, 30, 45]
const termLine = (d) => `Net ${d} — bank transfer or card`
const NOTES = [
  'Thank you for your business!',
  'Please reference the invoice number with your payment.',
  'Payment appreciated within terms. Questions? Just reply to this email.',
  '',
]

// --- invoices --------------------------------------------------------------
// Controlled distribution so the dashboard looks alive:
//   14 paid (spread across the last 6 months), 6 sent (due in future),
//    4 overdue (sent, past due), 4 draft.
const invoices = []

function baseInvoice(issueDate, termDays) {
  const client = pick(CLIENTS)
  const lineItems = makeLineItems()
  const due = addDays(issueDate, termDays)
  return {
    clientId: client.id,
    issueDate: iso(issueDate),
    dueDate: iso(due),
    lineItems,
    discount: rng() > 0.75 ? int(1, 5) * 50 : 0,
    taxRate: pick([0, 5, 8, 8, 8, 15]),
    terms: termLine(termDays),
    notes: pick(NOTES),
  }
}

// 14 paid — 2–3 per month across offsets 0..5. Anchor on the PAID date (never
// in the future) and derive issue a few weeks earlier, so issue < paid <= today
// always holds and "avg days to pay" is never skewed by a phantom 0.
const paidPlan = [0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5]
for (const offset of paidPlan) {
  let paid = monthsAgo(offset, int(2, 26))
  if (paid > ANCHOR) paid = addDays(ANCHOR, -int(0, 6))
  const term = pick(TERMS_DAYS)
  const issue = addDays(paid, -int(3, 30)) // issued before it was paid
  invoices.push({ ...baseInvoice(issue, term), status: 'paid', paidAt: new Date(paid).toISOString() })
}

// 4 overdue — issued 40–85 days ago with short terms, still 'sent'
for (let i = 0; i < 4; i++) {
  const issue = addDays(ANCHOR, -int(40, 85))
  const term = pick([15, 30])
  invoices.push({ ...baseInvoice(issue, term), status: 'sent', paidAt: null })
}

// 6 sent — issued recently, due in the future
for (let i = 0; i < 6; i++) {
  const issue = addDays(ANCHOR, -int(1, 12))
  const term = pick([30, 45])
  invoices.push({ ...baseInvoice(issue, term), status: 'sent', paidAt: null })
}

// 4 draft — very recent, no payment
for (let i = 0; i < 4; i++) {
  const issue = addDays(ANCHOR, -int(0, 6))
  invoices.push({ ...baseInvoice(issue, pick(TERMS_DAYS)), status: 'draft', paidAt: null })
}

// Number sequentially by issue date, oldest = LED-0001.
invoices.sort((a, b) => a.issueDate.localeCompare(b.issueDate))
invoices.forEach((inv, i) => {
  inv.id = `inv${i + 1}`
  inv.number = `LED-${String(i + 1).padStart(4, '0')}`
  inv.createdAt = new Date(`${inv.issueDate}T09:00:00Z`).toISOString()
})

// Reorder fields for readable JSON.
const orderedInvoices = invoices.map((inv) => ({
  id: inv.id,
  number: inv.number,
  clientId: inv.clientId,
  issueDate: inv.issueDate,
  dueDate: inv.dueDate,
  status: inv.status,
  lineItems: inv.lineItems,
  discount: inv.discount,
  taxRate: inv.taxRate,
  paidAt: inv.paidAt,
  notes: inv.notes,
  terms: inv.terms,
  createdAt: inv.createdAt,
}))

// --- settings --------------------------------------------------------------
const settings = {
  id: 'settings',
  businessName: 'Northwind Studio',
  addressLine: '128 Harbor View Rd, Suite 4\nSeattle, WA 98104',
  email: 'billing@northwindstudio.com',
  phone: '+1 (206) 555-0148',
  logo: null,
  prefix: 'LED',
  nextNumber: invoices.length + 1,
  currency: 'USD',
  defaultTaxRate: 8,
}

// --- write -----------------------------------------------------------------
const w = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n')
w('clients.json', CLIENTS)
w('invoices.json', orderedInvoices)
w('settings.json', settings)

// quick sanity report
const by = (s) => orderedInvoices.filter((i) => i.status === s).length
console.log(
  `seed: ${CLIENTS.length} clients, ${orderedInvoices.length} invoices ` +
    `(paid ${by('paid')}, sent ${by('sent')}, draft ${by('draft')}), next #${settings.nextNumber}`,
)
