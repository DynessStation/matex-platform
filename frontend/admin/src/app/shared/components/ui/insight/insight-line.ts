import { Component, computed, input } from '@angular/core';

export interface InsightLineSeries {
  label: string;
  /** Any CSS colour. */
  color: string;
  values: number[];
}

const WIDTH = 300;
const HEIGHT = 110;

// Line chart of a few series over the same labels, drawn as plain SVG so it follows the theme and
// adds no library (G-5). Each point names its value when hovered.
@Component({
  selector: 'app-insight-line',
  template: `
    <div class="insight-line" data-testid="insight-line">
      <div class="insight-line-plot">
        <div class="insight-line-axis" aria-hidden="true">
          <span>{{ maximum() }}</span>
          <span>0</span>
        </div>
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          preserveAspectRatio="none"
          role="img"
          [attr.aria-label]="summary()"
        >
          @for (line of lines(); track line.label) {
            <polyline
              fill="none"
              vector-effect="non-scaling-stroke"
              stroke-width="1.5"
              [attr.stroke]="line.color"
              [attr.points]="line.points"
            />
            @for (dot of line.dots; track $index) {
              <circle
                r="2"
                vector-effect="non-scaling-stroke"
                [attr.fill]="line.color"
                [attr.cx]="dot.x"
                [attr.cy]="dot.y"
              >
                <title>{{ dot.title }}</title>
              </circle>
            }
          }
        </svg>
      </div>
      <div class="insight-line-labels" aria-hidden="true">
        @for (label of shownLabels(); track $index) {
          <span>{{ label }}</span>
        }
      </div>
      <ul class="insight-line-legend">
        @for (item of series(); track item.label) {
          <li>
            <i [style.background-color]="item.color" aria-hidden="true"></i>
            {{ item.label }}
          </li>
        }
      </ul>
    </div>
  `,
})
export class InsightLine {
  readonly labels = input<string[]>([]);
  readonly series = input<InsightLineSeries[]>([]);

  readonly width = WIDTH;
  readonly height = HEIGHT;

  readonly maximum = computed(() =>
    Math.max(1, ...this.series().flatMap((item) => item.values)),
  );

  readonly lines = computed(() => {
    const labels = this.labels();
    const top = this.maximum();
    const step = labels.length > 1 ? WIDTH / (labels.length - 1) : 0;
    return this.series().map((item) => {
      const dots = item.values.map((value, index) => ({
        x: Math.round(index * step * 10) / 10,
        y: Math.round((HEIGHT - 4 - (value / top) * (HEIGHT - 8)) * 10) / 10,
        title: `${labels[index]}: ${item.label} ${value}`,
      }));
      return {
        label: item.label,
        color: item.color,
        dots,
        points: dots.map((dot) => `${dot.x},${dot.y}`).join(' '),
      };
    });
  });

  /** At most seven labels under the chart. */
  readonly shownLabels = computed(() => {
    const labels = this.labels();
    const every = Math.max(1, Math.ceil(labels.length / 7));
    return labels.filter((_, index) => index % every === 0);
  });

  readonly summary = computed(() =>
    this.series()
      .map(
        (item) =>
          `${item.label}: ${item.values.reduce((all, value) => all + value, 0)}`,
      )
      .join(', '),
  );
}
