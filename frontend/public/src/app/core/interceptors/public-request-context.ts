import { HttpContextToken } from '@angular/common/http';

// Public CMS reads still need the SSR loopback rewrite, but they should not
// trigger storefront auth, loader, or toast behavior.
export const SKIP_PUBLIC_UI_INTERCEPTORS = new HttpContextToken<boolean>(() => false);
