# MATEX fixed website pages

## Scope

The public website uses a fixed set of sections instead of a generic page builder:

- `home`
- `about`
- `terms`
- `career`
- `contact`
- `faq`

Admin exposes one editor for each section. Administrators can manage Indonesian and English copy, SEO, publication state, and the media slots supported by that section. There is no create-page, trash, arbitrary template, or arbitrary-route flow.

The page presentation records live in `website_page`, `website_page_i18n`, `website_page_media`, and `website_page_media_i18n`. Contact channels, offices, inquiries, and FAQ entries remain in their own operational tables.

## Routes and configuration

- Admin API: `GET|PUT /api/admin/website-page/:key`.
- Public API: `GET /api/public/website-page/:locale/:path`.
- Public locales: `id-ID` and `en-US`.
- Backend deployment scope: `PUBLIC_COMPANY_ID`.
- Public frontend settings: `publicApiURL` and `publicSiteURL`.

The planned production website is `https://matexindo.com`. The production frontend currently
expects the public API through the same origin at `https://matexindo.com/api/public`, which keeps
browser requests and SSR canonical URLs on one domain. If the API is later moved to a subdomain,
change `publicApiURL` and add that frontend origin to `CORS_ORIGINS`; `publicSiteURL` remains the
canonical website origin.

The planned production admin is `https://internal.matexindo.com`. Its production build expects
the admin API through the same origin at `https://internal.matexindo.com/api/admin`; the reverse
proxy should forward `/api` to the backend. Google Maps credentials are intentionally blank in the
tracked production environment and must be supplied through the release configuration before a
build that enables map features.

The company scope comes from server configuration and cannot be overridden by a browser request. Public endpoints return only active, published content for the configured company.

## Navigation

The public header accepts six fixed keys: `home`, `about`, `categories`, `products`, `articles`, and `contact`. Admin controls their localized labels, visible state, and drag-and-drop order. Destinations are derived from the key and locale. Product and category dropdown contents come from the published catalog.

## Home media contract

Home retains the original Kartify gadget layout. The original canvas defines the recommended dimensions, while the API enforces a minimum size and a five-percent aspect-ratio tolerance.

| Role | Slot | Recommended | Minimum |
| --- | --- | ---: | ---: |
| `home_main` | Main banner | 3528 x 1956 | 1764 x 978 |
| `home_side_1` | Top side banner | 1400 x 984 | 700 x 492 |
| `home_side_2` | Bottom side banner | 1400 x 984 | 700 x 492 |
| `home_tile_1` | Tile 1 | 1172 x 984 | 586 x 492 |
| `home_tile_2` | Tile 2 | 1172 x 984 | 586 x 492 |
| `home_tile_3` | Tile 3 | 1172 x 984 | 586 x 492 |
| `home_tile_4` | Tile 4 | 1404 x 984 | 702 x 492 |

JPEG, PNG, and WebP are accepted. Each banner can optionally point to an internal page, external URL, product, or category. All required slots must be valid and public before Home can be published or scheduled.

## Verification

From `backend` run `npm run typecheck` and `npm test`. From each frontend directory run `npm run build`. The contract tests cover company scoping, publication, fixed navigation, safe media, and Home media dimensions.

Migration `20261004_013_remove_legacy_cms.sql` removes the replaced generic tables, permissions, and obsolete navigation columns after the fixed-page data has been copied.
