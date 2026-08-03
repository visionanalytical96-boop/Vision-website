# BharatStay — User Roles & Permissions

| Role | Description | Key permissions |
|---|---|---|
| `CUSTOMER` | End traveller | Search, book, pay, manage own bookings/profile, request refunds, write reviews |
| `PARTNER` | Property owner (hotel/resort/villa/homestay/farm-stay) | Manage own properties, rooms, inventory, pricing, view own bookings, view own earnings |
| `PARTNER_STAFF` | Staff invited by a partner | Scoped subset of partner permissions (e.g. booking management only) |
| `AGENT` | B2B travel agent | Book at net rates, manage own customers, sub-agents, wallet, white-label vouchers |
| `SUB_AGENT` | Agent-created sub-agent | Scoped booking permissions under parent agent's credit limit |
| `CORPORATE_ADMIN` | Company travel admin | Manage employees, travel policy, approvals, department budgets, billing |
| `CORPORATE_TRAVELER` | Company employee | Book within policy, submit for approval, view own travel history |
| `SUPPORT_AGENT` | Internal support staff | View/respond to support tickets, view bookings (read-mostly) |
| `FINANCE_ADMIN` | Internal finance staff | Payments, refunds, settlements, invoices, commission reports |
| `ADMIN` | Platform admin | Manage bookings, properties, payments, refunds, coupons, content |
| `SUPER_ADMIN` | Full platform control | Everything `ADMIN` can do + roles/permissions, audit logs, API provider config |

## Access matrix (high level)

| Capability | Customer | Partner | Agent | Corporate Admin | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Search & book | ✅ | – | ✅ (on behalf of) | ✅ (within policy) | – |
| Manage own property listings | – | ✅ | – | – | ✅ (all) |
| Approve property listings | – | – | – | – | ✅ |
| View own bookings | ✅ | ✅ (property-scoped) | ✅ (agency-scoped) | ✅ (company-scoped) | ✅ (all) |
| Issue refunds | Request only | – | Request only | Request only | ✅ approve/initiate |
| Manage coupons/offers | – | – | – | – | ✅ |
| View platform analytics | – | Own property only | Own agency only | Own company only | ✅ |
| Manage roles & permissions | – | – | – | – | ✅ (`SUPER_ADMIN`) |

Enforced server-side via role checks on every mutating route handler; UI-level hiding of controls is a convenience, not a security boundary.
