import {
  afterNextRender,
  Component,
  DestroyRef,
  DOCUMENT,
  inject,
} from '@angular/core';

import { environment } from '../../../../environments/environment';

const TITLE_PREFIX = '[DEV] ';

// Marks non-production builds (ng serve, e2e) so a local tab is never mistaken for
// production: a striped bar on top, a corner label with the API host, and a
// "[DEV]" prefix on the browser tab title. Renders nothing in production builds.
@Component({
  selector: 'app-dev-environment-badge',
  standalone: true,
  template: `
    @if (visible) {
      <div class="dev-env-bar" aria-hidden="true"></div>
      <div class="dev-env-badge" role="status">
        <strong>DEV</strong><span>{{ apiHost }}</span>
      </div>
    }
  `,
  styles: `
    .dev-env-bar {
      position: fixed;
      inset: 0 0 auto 0;
      height: 4px;
      background: repeating-linear-gradient(
        45deg,
        #ff6b00 0 12px,
        #111 12px 24px
      );
      z-index: 2147483000;
      pointer-events: none;
    }
    .dev-env-badge {
      position: fixed;
      left: 12px;
      bottom: 12px;
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 4px 10px;
      border: 2px solid #ff6b00;
      border-radius: 999px;
      background: #111;
      color: #fff;
      font:
        600 12px/1.2 system-ui,
        sans-serif;
      opacity: 0.92;
      z-index: 2147483000;
      pointer-events: none;
    }
    .dev-env-badge strong {
      color: #ff6b00;
      letter-spacing: 0.08em;
    }
    @media print {
      .dev-env-bar,
      .dev-env-badge {
        display: none;
      }
    }
  `,
})
export class DevEnvironmentBadge {
  readonly visible = !environment.production;
  readonly apiHost = new URL(environment.API_URL).host;

  constructor() {
    if (!this.visible) return;

    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    // Pages set their own titles; keep the prefix on whatever title is current.
    afterNextRender(() => {
      const addPrefix = () => {
        if (!document.title.startsWith(TITLE_PREFIX)) {
          document.title = TITLE_PREFIX + document.title;
        }
      };
      addPrefix();
      const observer = new MutationObserver(addPrefix);
      observer.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
