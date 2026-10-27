import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { map } from 'rxjs';

/**
 * Whether the route resolver found nothing (`data: false`). The page then shows the 404 view
 * in place, which answers status 404; the address stays as the visitor typed it.
 */
export function resolvedMissing(): Signal<boolean> {
  return toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['data'] === false)), {
    initialValue: false,
  });
}
