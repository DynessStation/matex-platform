import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

import { Params } from '../interface/core.interface';
import { TagModel } from '../interface/tag.interface';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  // The home page tags section waits for a backend source (owner plan). Until then there are
  // no tags; the Kartify demo tags (tag.json: Nokia, Samsung, ...) were removed in 6B.
  getTags(_payload?: Params): Observable<TagModel> {
    return of({ data: [], total: 0 } as unknown as TagModel);
  }
}
