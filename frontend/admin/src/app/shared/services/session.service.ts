import {
  DOCUMENT,
  Injectable,
  OnDestroy,
  inject,
} from '@angular/core';

import { Store } from '@ngxs/store';
import {
  BehaviorSubject,
  Subscription,
  fromEvent,
  interval,
  merge,
  timer,
} from 'rxjs';

import { LogoutAction } from '../store/action/auth.action';
import { AuthState } from '../store/state/auth.state';

@Injectable({
  providedIn: 'root',
})
export class SessionService implements OnDestroy {
  private store = inject(Store);
  private document = inject(DOCUMENT);

  private expirySubscription?: Subscription;
  private resumeSubscription?: Subscription;
  private countdownSubscription?: Subscription;

  private remainingTimeSubject =
    new BehaviorSubject<number>(0);

  remainingTime$ =
    this.remainingTimeSubject.asObservable();

  constructor() {
    this.initializeResumeWatcher();
  }

  startExpiryWatcher(): void {
    this.stopExpiryTimer();
    this.stopCountdown();

    const expiresAt = this.getExpiresAt();

    if (!expiresAt) {
      this.remainingTimeSubject.next(0);
      return;
    }

    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      this.logout();
      return;
    }

    this.remainingTimeSubject.next(remaining);

    this.expirySubscription = timer(
      remaining,
    ).subscribe(() => {
      this.logout();
    });

    this.startCountdown();
  }

  stopExpiryWatcher(): void {
    this.stopExpiryTimer();
    this.stopCountdown();

    this.remainingTimeSubject.next(0);
  }

  private startCountdown(): void {
    this.countdownSubscription = interval(
      1000,
    ).subscribe(() => {
      const expiresAt = this.getExpiresAt();

      if (!expiresAt) {
        this.remainingTimeSubject.next(0);
        return;
      }

      const remaining = Math.max(
        0,
        expiresAt - Date.now(),
      );

      this.remainingTimeSubject.next(remaining);
    });
  }

  private initializeResumeWatcher(): void {
    if (!this.document.defaultView) {
      return;
    }

    const window = this.document.defaultView;

    this.resumeSubscription = merge(
      fromEvent(
        this.document,
        'visibilitychange',
      ),
      fromEvent(window, 'focus'),
    ).subscribe(() => {
      if (this.document.hidden) {
        return;
      }

      this.checkSession();
    });
  }

  private checkSession(): void {
    const authenticated =
      this.store.selectSnapshot(
        AuthState.isAuthenticated,
      );

    if (!authenticated) {
      return;
    }

    const expiresAt = this.getExpiresAt();

    if (!expiresAt) {
      return;
    }

    if (Date.now() >= expiresAt) {
      this.logout();
      return;
    }

    this.startExpiryWatcher();
  }

  private getExpiresAt(): number | null {
    const session =
      this.store.selectSnapshot(
        AuthState.session,
      );

    return session?.expires_at ?? null;
  }

  private logout(): void {
    this.stopExpiryTimer();
    this.stopCountdown();

    this.remainingTimeSubject.next(0);

    this.store.dispatch(
      new LogoutAction(),
    );
  }

  private stopExpiryTimer(): void {
    this.expirySubscription?.unsubscribe();
    this.expirySubscription = undefined;
  }

  private stopCountdown(): void {
    this.countdownSubscription?.unsubscribe();
    this.countdownSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stopExpiryTimer();
    this.stopCountdown();

    this.resumeSubscription?.unsubscribe();
    this.resumeSubscription = undefined;
  }
}