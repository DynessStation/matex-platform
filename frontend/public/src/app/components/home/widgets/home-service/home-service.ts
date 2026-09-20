import { Component, effect, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Service, ServiceModel } from '../../../../shared/interface/service.interface';
import { ServiceState } from '../../../../shared/store/state/service.state';

@Component({
  selector: 'app-home-service',
  imports: [],
  templateUrl: './home-service.html',
  styleUrl: './home-service.scss',
})
export class HomeService {
  serviceIds = input<number[] | null>(null);
  type = input<string>();

  private store = inject(Store);
  service$: Observable<ServiceModel> = this.store.select(ServiceState.service);

  public services: Service[];

  constructor() {
    effect(() => {
      const ids = this.serviceIds();
      if (Array.isArray(ids) && ids.length) {
        this.service$.subscribe((services) => {
          this.services = services.data.filter((s) => ids.includes(s.id));
        });
      } else {
        this.services = [];
      }
    });
  }
}
