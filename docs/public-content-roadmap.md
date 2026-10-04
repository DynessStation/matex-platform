# MATEX public content map

This document records the boundary between the Kartify presentation, MATEX data, and commerce features that are not part of public v1. `gadget-store` is an internal theme name and must not appear as a MATEX business label.

## Principles

- Kartify remains the source of public layout, responsive behavior, spacing, and visual components.
- The backend and database are the public data source. Kartify JSON files are presentation fixtures only.
- Indonesian (`id-ID`) and English (`en-US`) content are stored separately.
- Every public query is scoped to `PUBLIC_COMPANY_ID` on the server.
- Public v1 covers company profile, catalog, articles, contact, FAQ, SEO, wishlist, cart, and outbound marketplace purchase links.
- First-party checkout, payment, inventory, and manufacturing workflows belong to a later mapped phase.

## Page and data ownership

| Public area | Kartify presentation | MATEX source |
| --- | --- | --- |
| Home | `components/home/gadget` | fixed page `home` and its seven media slots |
| About MATEX | `components/page/about-us` | fixed page `about`; testimonials remain local presentation data for now |
| Contact | `components/page/contact-us` | fixed page `contact`, `office*`, public contact channels, inquiry topics, and inquiries |
| FAQ | `components/page/faq` | fixed page `faq` plus structured FAQ tables |
| Terms | existing standard page presentation | fixed page `terms` |
| Career | existing career presentation | fixed page `career` |
| Articles | `components/blog` | article, category, tag, translation, and media tables |
| Product categories | category and collection components | product category, translation, hierarchy, and media tables |
| Products | product detail and product card components | product, translation, media, price, stock presentation, and marketplace tables |

The four `website_page*` tables own page copy, publication, SEO, and page media. Operational content stays in its domain tables so changing page metadata does not duplicate contact offices, inquiries, FAQ records, articles, or products.

## Navigation

The header is fixed to Home, About MATEX, Category, Product, Article, and Contact. Admin can change Indonesian and English labels, visibility, and order. Category and Product dropdown contents are derived from published catalog data. Arbitrary link types, parent items, page selectors, icons, badges, and active flags are not part of the stored navigation model.

## Catalog and commerce boundary

- Marketplace links remain valid without marketplace API integration.
- Wishlist and cart can use local storage until public authentication and first-party orders are designed.
- Currency behavior remains present but its final multi-currency flow is deferred.
- SKU and catalog records can later reference inventory and manufacturing modules; manufacturing is not embedded as free-form product fields.
- Marketplace API integrations are decided per platform after partner access, cost, and synchronization value are verified.

## Tests and production packaging

`backend/tests` contains contract and regression tests. The folder is not imported by `src/app.ts` and is not part of runtime endpoints. Production packaging should install production dependencies and compile the application without copying source tests into the runtime image.

The fixed-page migration is complete when the database has no legacy generic page tables or permissions, active source code has no generic page routes or services, both frontends build, backend typecheck and contract tests pass, and local development listeners are stopped after verification.
