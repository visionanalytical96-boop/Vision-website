# BharatStay — Roadmap

## Built in this pass

- Marketing homepage with multi-modal search (hotels/flights/buses/cabs/packages tabs)
- Hotel search results (filters, sorting) + hotel detail page
- Flight, bus, cab results pages (filter/sort over demo inventory) + holiday packages and activities listing pages + a train-search readiness placeholder
- Multi-step checkout + payment status page
- Hotel voucher, flight e-ticket, and GST payment receipt templates (print/PDF-ready HTML)
- Login / register pages (email+password UI, OTP tab)
- Customer, Partner, Admin dashboards (demo data, core screens)
- Prisma schema for the full domain
- Demo dataset across hotels, destinations, offers, packages, flights, buses, cabs, reviews
- Architecture, sitemap, roles, deployment docs

## Not yet built (next steps, roughly in priority order)

1. **Auth wiring** — real password hashing + session/JWT issuance, OTP send/verify via SMS provider adapter, Google/Apple/Facebook OAuth.
2. **Flight/bus/cab passenger & seat-selection detail pages** — results pages exist and link into checkout with a flat amount; dedicated seat-map/passenger-details steps (per the original brief) aren't built, so checkout skips straight to guest details.
3. **Package/activity detail pages** — `/packages` and `/activities` are listing-only; `/packages/[slug]` detail pages aren't built.
4. **Real payment integration** — wire `PaymentProvider` interface to a real Razorpay/Cashfree/PayU/Stripe sandbox; implement webhook signature verification.
5. **PDF generation** — server-side PDF rendering (e.g. `@react-pdf/renderer` or Puppeteer) for vouchers/receipts; QR code generation for booking verification.
6. **Persistence** — connect Prisma schema to a real PostgreSQL instance, replace mock-data reads with DB queries + Redis caching for search.
7. **Travel agent (B2B) dashboard** — registration, KYC, wallet, credit limit, markup/commission control, sub-agents, white-label vouchers.
8. **Corporate travel dashboard** — company registration, employee profiles, travel policy, approval workflow, department budgets, monthly billing.
9. **Refund/cancellation workflow UI** — customer-facing cancellation request flow + status tracker; admin approval/refund-initiation flow (schema already models this).
10. **Notifications** — email/SMS/WhatsApp/push notification service wired to provider adapters for booking lifecycle events.
11. **SEO** — dynamic metadata, Open Graph tags, JSON-LD (Hotel/Product/FAQ/Review schema), sitemap.xml/robots.txt, city/destination landing pages, blog.
12. **Partner property CRUD + admin approval queue** — currently read-only demo views; need create/edit forms and an approval action.
13. **Search/availability engine** — currently static demo data; needs a real query layer (filters, pagination, date-based room/seat availability).
14. **Testing** — Vitest + React Testing Library for components/utils, Playwright for the booking → payment → voucher e2e path.
15. **PWA/offline readiness, dark mode, i18n/currency switching** — UI affordances exist in the header (language/currency selectors) but are not functionally wired.

## Explicit non-goals right now

- No live third-party API keys or credentials anywhere in the repo.
- No claim of live/bookable inventory — everything is clearly demo data.
