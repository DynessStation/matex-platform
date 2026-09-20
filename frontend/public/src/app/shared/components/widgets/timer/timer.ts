import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, Inject, input, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Component({
  selector: 'app-timer',
  imports: [AsyncPipe],
  templateUrl: './timer.html',
  styleUrl: './timer.scss',
})
export class Timer implements OnInit, OnDestroy {
  readonly title = input<string | null>();
  readonly type = input<string>('timer-one');
  readonly class = input<string>('product-timer');

  private timeSubject = new BehaviorSubject<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  public time$: Observable<{ days: number; hours: number; minutes: number; seconds: number } | null> = this.timeSubject.asObservable();

  public interval?: ReturnType<typeof setInterval>;

  public formattedDays = '00';
  public formattedHours = '00:00:00';
  public formattedTime = '00:00';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {
    this.updateTimer();
    if (isPlatformBrowser(this.platformId)) {
      this.startTimer();
    }
  }

  private updateTimer() {
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    targetDate.setDate(targetDate.getDate() + 9);

    const now = new Date();
    const distance = targetDate.getTime() - now.getTime();

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    this.timeSubject.next({ days, hours, minutes, seconds });

    const d = this.pad(days);
    const h = this.pad(hours);
    const m = this.pad(minutes);
    const s = this.pad(seconds);

    this.formattedDays = d;
    this.formattedTime = `${m}:${s}`;
    this.formattedHours = `${h}:${m}:${s}`;
  }

  private startTimer() {
    this.interval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }
}
