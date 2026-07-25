# BharatStay — Sitemap

Legend: ✅ built in this scaffold · 🚧 planned (see `ROADMAP.md`)

## Public / marketing
- `/` — Home ✅
- `/about` — About BharatStay 🚧
- `/contact` — Contact Us 🚧
- `/support` — Customer Support / Help Centre 🚧
- `/offers` — Offers 🚧
- `/blog` and `/blog/[slug]` — Travel blog 🚧
- `/careers` — Careers 🚧
- `/legal/privacy-policy` 🚧
- `/legal/terms` 🚧
- `/legal/cancellation-policy` 🚧
- `/legal/refund-policy` 🚧
- `/legal/cookie-policy` 🚧
- `/legal/partner-terms` 🚧
- `/legal/agent-terms` 🚧
- `/legal/gst-information` 🚧
- `/faqs` 🚧

## Auth
- `/login` ✅
- `/register` ✅
- `/partner/login` 🚧
- `/agent/login` 🚧

## Hotels & stays
- `/hotels` — search results (hotels/resorts/villas/homestays/farm-stays) ✅
- `/hotels/[id]` — property detail ✅
- SEO landing pages (`/hotels/goa`, `/resorts/near-mumbai`, `/farm-stays/near-pune`, ...) 🚧

## Flights / Buses / Trains / Cabs / Packages / Activities
- `/flights` — search + results 🚧 (search UI on homepage ✅, results page 🚧)
- `/buses` — search + results 🚧 (search UI on homepage ✅, results page 🚧)
- `/trains` — search + redirect-to-partner readiness 🚧
- `/cabs` — search + results 🚧 (search UI on homepage ✅, results page 🚧)
- `/packages` — holiday packages listing 🚧 (cards on homepage ✅)
- `/activities` — local activities & sightseeing 🚧

## Booking & payments
- `/checkout` — multi-step checkout (review → guest details → add-ons → coupon/GST → payment → confirmation) ✅
- `/payment-status/[bookingId]` — payment status page ✅
- `/refund-status/[requestId]` — refund status 🚧
- `/vouchers/hotel/[bookingId]` — hotel voucher ✅
- `/vouchers/flight/[bookingId]` — flight e-ticket ✅
- `/vouchers/receipt/[bookingId]` — GST payment receipt ✅

## Customer dashboard (`/dashboard/customer/*`)
- `/dashboard/customer` — overview ✅
- `/dashboard/customer/bookings` — upcoming / completed / cancelled ✅
- `/dashboard/customer/payments` — payment history, receipts ✅
- `/dashboard/customer/wallet` — wallet & credits, coupon wallet 🚧
- `/dashboard/customer/wishlist` — saved properties 🚧
- `/dashboard/customer/travellers` — saved travellers 🚧
- `/dashboard/customer/support` — support tickets 🚧
- `/dashboard/customer/profile` — profile & account security 🚧

## Property partner dashboard (`/dashboard/partner/*`)
- `/dashboard/partner` — overview ✅
- `/dashboard/partner/properties` — property listing & rooms 🚧
- `/dashboard/partner/bookings` — booking management ✅
- `/dashboard/partner/pricing` — pricing calendar 🚧
- `/dashboard/partner/earnings` — earnings & settlement report ✅
- `/dashboard/partner/kyc` — KYC/PAN/GST/bank details 🚧

## Travel agent (B2B) dashboard — 🚧 not built in this pass
- `/dashboard/agent`, `/dashboard/agent/bookings`, `/dashboard/agent/wallet`, `/dashboard/agent/sub-agents`, `/dashboard/agent/reports`

## Corporate travel dashboard — 🚧 not built in this pass
- `/dashboard/corporate`, `/dashboard/corporate/employees`, `/dashboard/corporate/policy`, `/dashboard/corporate/approvals`, `/dashboard/corporate/billing`

## Admin dashboard (`/dashboard/admin/*`)
- `/dashboard/admin` — analytics overview ✅
- `/dashboard/admin/bookings` — all bookings ✅
- `/dashboard/admin/payments` — payments + offline proof verification ✅
- `/dashboard/admin/properties` — property approval queue ✅
- `/dashboard/admin/refunds` — refund/cancellation queue ✅
- `/dashboard/admin/coupons`, `/dashboard/admin/users`, `/dashboard/admin/content` 🚧
