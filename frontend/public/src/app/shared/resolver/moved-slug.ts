import { inject, RESPONSE_INIT } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, Router } from '@angular/router';

/**
 * For the slug resolvers: call it first, while inject() still works. The returned function turns
 * a failed lookup into a permanent redirect when the API says the page moved (`data.moved_to`, a
 * slug changed in the admin), and into `false` (the 404 view, resolved-missing.ts) otherwise.
 */
export function movedSlugHandler(route: ActivatedRouteSnapshot) {
  const router = inject(Router);
  const response = inject(RESPONSE_INIT, { optional: true });

  return (error: unknown): RedirectCommand | false => {
    const moved = (error as { error?: { data?: { moved_to?: unknown } } })?.error?.data?.moved_to;
    const path = route.routeConfig?.path;
    if (typeof moved !== 'string' || !moved || !path) return false;
    if (response) response.status = 301;
    const target = router.createUrlTree(['/', ...path.replace(':slug', moved).split('/')], {
      queryParams: route.queryParams,
    });
    return new RedirectCommand(target, { replaceUrl: true });
  };
}
