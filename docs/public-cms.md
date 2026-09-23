# MATEX public CMS — initial HTML renderer

## Routes and scope

- Frontend: `/cms/:locale/:slug` (local public app: port 4201).
- API: `GET /api/public/cms-page/:locale/:slug`.
- Supported locales: `id-ID`, `en-US`. The URL selects an exact published translation; there is no fallback to draft or another language. Language links use each translation's own slug.
- Set `PUBLIC_CMS_COMPANY_ID` in the backend deployment environment to the intended `master_comp.id_master_comp`. Missing/invalid configuration returns 503. Requests cannot override this scope.
- `CORS_ORIGINS` is a comma-separated allowlist; the local defaults allow admin on 4200 and public on 4201.
- Configure `cmsApiURL` and `cmsSiteURL` in the public frontend environment files. Production builds select `environment.prod.ts`; replace its local defaults before deployment. Add the actual public hostname to `angular.json` → build → options → security → allowedHosts for SSR.

## Publication contract

A page must be non-deleted, published, HTML content mode, and public or unlisted. Publication starts inclusively (`publish_at <= NOW()`) and ends exclusively (`unpublish_at > NOW()`), following database time. Null bounds are open. The requested translation must also be published. All ineligible/missing pages return the same 404.

Unlisted pages are accessible by direct URL and force `noindex, nofollow`. This iteration adds no public listing, navigation population or sitemap. Public media must belong to the configured company, be active and non-deleted, have a public page association, and use a supported raster image MIME type. Internal IDs, draft translations, settings and audit data are not returned.

The renderer includes title, excerpt, sanitized HTML, hero/gallery, localized captions, ID/EN links, canonical/hreflang links and Open Graph metadata. Angular sanitizes HTML; no security bypass is used. Missing pages return SSR 404, service failures return SSR 503, both with noindex. API responses use no-store so publication changes are re-evaluated on each request.

JSON/block rendering and structured-data schema output remain outside this initial HTML renderer. Opening a page is a snapshot; an already-open tab does not automatically refresh at its expiry time.

## Gadget-store Home media contract

The public Home keeps the original Kartify `components/home/gadget` layout. CMS attachments replace the seven opening banner slots by role; no parallel Home component is introduced. The original template canvases define the recommended dimensions. Admin shows both the recommendation and the enforced minimum (50% of the original canvas).

| Role          | Slot               | Recommended |    Minimum |
| ------------- | ------------------ | ----------: | ---------: |
| `home_main`   | Main banner        | 3528 × 1956 | 1764 × 978 |
| `home_side_1` | Top side banner    |  1400 × 984 |  700 × 492 |
| `home_side_2` | Bottom side banner |  1400 × 984 |  700 × 492 |
| `home_tile_1` | Tile 1             |  1172 × 984 |  586 × 492 |
| `home_tile_2` | Tile 2             |  1172 × 984 |  586 × 492 |
| `home_tile_3` | Tile 3             |  1172 × 984 |  586 × 492 |
| `home_tile_4` | Tile 4             |  1404 × 984 |  702 × 492 |

JPEG, PNG, and WebP are accepted. The aspect ratio may differ by at most 5% from the original canvas. Draft pages may have empty required slots, but assigned media must already be valid. All seven roles must point to public media before a Home page can be published or scheduled. The Backend repeats these checks, so the rule cannot be bypassed by calling the API directly.

## Legacy boundary

The old storefront bootstrap lives in `legacy-app.ts`, under the existing non-CMS routes. It is template code, not a verified MATEX commerce module. The CMS route uses its own shell and anonymous HTTP service, without template auth/error interceptors or shop data dispatches. Existing auth type mismatches were repaired and automatic demo account/token seeding removed so the public app builds cleanly.

## Verification

From `backend`:

```text
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --outDir dist/tests-build
node --test dist/tests-build/tests/public-cms-page.test.js dist/tests-build/tests/cms-page-media-contract.test.js
```

These HTTP contract tests stub the database query boundary. They verify tenant binding, SQL publication predicates, generic 404 responses, private-field projection, public-media filters and unlisted noindex. They do not replace integration testing against the deployment database.

Verified locally with temporary API fixtures: SSR 200/404/503 and no-store headers, HTML script/event-handler sanitization, canonical/hreflang output, browser ID→EN navigation, and a single canonical matching the active language after hydration. The fixture servers were stopped after verification; no CMS records were written.

From each frontend directory:

```text
node node_modules/@angular/cli/bin/ng.js build --configuration development --progress=false
```

For acceptance with the configured backend: open a published ID page, switch to its published EN slug, verify hero/gallery and SEO, then check draft/private/trash, future publication, expiry and unpublished translations all return 404. Verify a second company's matching slug cannot be selected through query parameters or headers.
