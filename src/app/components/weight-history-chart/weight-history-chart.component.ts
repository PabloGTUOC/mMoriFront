import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
// Only the D3 modules this chart uses, rather than the whole meta-package (6.6).
import { Selection, select, selectAll } from 'd3-selection';
import { extent, max, min } from 'd3-array';
import { scaleLinear, scaleTime } from 'd3-scale';
import { curveMonotoneX, line as d3Line } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { WeightHistory } from '../../models';

/** A `WeightHistory` entry with its date parsed, which is what the scales and line consume. */
interface WeightPoint {
  date: Date;
  weight: number;
}

@Component({
  selector: 'app-weight-history-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="weight-chart-container">
      <h3>Weight History</h3>
      <div #chart class="chart" [class.chart--empty]="!weightData || weightData.length === 0"></div>
      <p *ngIf="!weightData || weightData.length === 0" class="no-data">
        No weight data available yet. Start logging your weight to see trends!
      </p>
    </div>
  `,
  styles: [`
    /* Angular hosts default to display:inline, which made the block below sit in an
       inline formatting context and ignore the auto margins that centre it. */
    :host {
      display: block;
    }

    /*
     * The app's single centred column (DESIGN.md §1). Every other block on the dashboard —
     * .info-block, .life, the status line — is 80% / 1400px / auto, but this one had
     * "margin: 20px 0" and no width, so it ran full-bleed and sat wider than everything
     * above it. It also used --card-background and --shadow-md, Material-era tokens that
     * nothing else in the app uses; it now takes the panel surface and the Resting shadow.
     */
    .weight-chart-container {
      width: 80%;
      max-width: 1400px;
      margin: 20px auto;
      padding: 20px;
      background: var(--panel-bg);
      color: var(--panel-text);
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      box-sizing: border-box;
      font-family: 'Roboto Mono', ui-monospace, monospace;
    }

    h3 {
      margin-top: 0;
      color: var(--panel-text);
      text-align: center;
    }

    .chart {
      width: 100%;
      min-height: 300px;
    }

    /* Without this an empty chart still reserved 300px, so a user with no weigh-ins saw a
       large blank box with the message stranded underneath it. */
    .chart--empty {
      min-height: 0;
    }

    /* --text-secondary is tuned for the page background, not the panel; on the light
       theme's panel it lands under 4.5:1. Dimmed panel ink keeps the same recessive feel
       without that. */
    .no-data {
      text-align: center;
      color: var(--panel-text);
      opacity: 0.75;
      font-style: italic;
    }
  `],
  // Redraws from ngOnChanges, not from change detection.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightHistoryChartComponent implements AfterViewInit, OnChanges {
  @Input() weightData: WeightHistory[] = [];
  @ViewChild('chart', { static: false }) chartElement!: ElementRef<HTMLDivElement>;

  // Optional rather than definite: `createChart` returns early when there is nothing to
  // draw, so every use is guarded.
  private svg?: Selection<SVGGElement, unknown, null, undefined>;
  private margin = { top: 20, right: 30, bottom: 50, left: 60 };
  private width = 0;
  private height = 300;

  /**
   * The chart is built here, not in `ngOnInit`.
   *
   * `chartElement` is a non-static `@ViewChild`, so it does not resolve until this hook.
   * `createChart` was only ever called from `ngOnInit`, where it hit its own
   * `if (!this.chartElement) return` guard every single time — `this.svg` was therefore
   * never created, and the `updateChart` call in `ngOnChanges` then bailed on
   * `if (!this.svg)`. There was no path that drew anything: the chart had never rendered,
   * with data or without.
   */
  ngAfterViewInit(): void {
    this.createChart();
  }

  /**
   * Create-or-update, rather than update-only. Weight history arrives asynchronously, so
   * the first meaningful data usually lands after the view exists but before any SVG does.
   */
  ngOnChanges(): void {
    if (!this.chartElement || !this.weightData || this.weightData.length === 0) {
      return;
    }

    if (this.svg) {
      this.updateChart();
    } else {
      this.createChart();
    }
  }

  private createChart(): void {
    if (!this.chartElement || !this.weightData || this.weightData.length === 0) {
      return;
    }

    const element = this.chartElement.nativeElement;
    this.width = element.offsetWidth - this.margin.left - this.margin.right;

    // Clear any existing chart
    select(element).selectAll('*').remove();

    // Create SVG
    this.svg = select(element)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.updateChart();
  }

  private updateChart(): void {
    if (!this.svg || !this.weightData || this.weightData.length === 0) {
      return;
    }

    const svg = this.svg;

    // Parse dates
    const data: WeightPoint[] = this.weightData.map(d => ({
      date: new Date(d.date),
      weight: d.weight
    }));

    // Create scales
    const x = scaleTime()
      .domain(extent(data, d => d.date) as [Date, Date])
      .range([0, this.width]);

    const y = scaleLinear()
      .domain([
        min(data, d => d.weight)! * 0.95,
        max(data, d => d.weight)! * 1.05
      ])
      .range([this.height, 0]);

    // Create line generator
    const line = d3Line<WeightPoint>()
      .x(d => x(d.date))
      .y(d => y(d.weight))
      .curve(curveMonotoneX);

    // Clear previous content
    svg.selectAll('*').remove();

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(axisLeft(y)
        .tickSize(-this.width)
        .tickFormat(() => '')
      );

    // Add line path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      // `.style`, not `.attr`: var() resolves in a CSS property but not in an SVG
      // presentation attribute, so `attr('stroke', 'var(--x)')` is simply invalid and the
      // path fell back to the default. Custom properties inherit here, so the line follows
      // the theme.
      .style('stroke', 'var(--md-primary)')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add dots
    svg.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.weight))
      .attr('r', 5)
      .style('fill', 'var(--md-primary)')
      .style('stroke', 'var(--md-surface-container)')
      .attr('stroke-width', 2)
      // `event` is typed by d3's own listener signature; the datum comes from `.data(data)`.
      .on('mouseover', (event, d) => {
        select(event.currentTarget)
          .attr('r', 8)
          .style('fill', 'var(--md-p-70)');

        // Show tooltip
        this.showTooltip(event, d);
      })
      .on('mouseout', (event) => {
        select(event.currentTarget)
          .attr('r', 5)
          .style('fill', 'var(--md-primary)');

        this.hideTooltip();
      });

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(axisBottom(x).ticks(5))
      .style('color', 'var(--md-on-surface-variant)');

    // Add Y axis
    svg.append('g')
      .call(axisLeft(y).ticks(5))
      .style('color', 'var(--md-on-surface-variant)');

    // Add axis labels
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - this.margin.left)
      .attr('x', 0 - (this.height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-primary)')
      .text('Weight (kg)');

    svg.append('text')
      .attr('transform', `translate(${this.width / 2},${this.height + this.margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-primary)')
      .text('Date');
  }

  private showTooltip(event: MouseEvent, d: WeightPoint): void {
    const tooltip = select('body')
      .append('div')
      .attr('class', 'weight-tooltip')
      .style('position', 'absolute')
      .style('background', 'var(--card-background)')
      .style('padding', '10px')
      .style('border', '1px solid var(--border-color)')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('box-shadow', 'var(--shadow-lg)')
      .style('z-index', '1000');

    tooltip.html(`
      <strong>Date:</strong> ${d.date.toLocaleDateString()}<br>
      <strong>Weight:</strong> ${d.weight.toFixed(1)} kg
    `)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }

  private hideTooltip(): void {
    selectAll('.weight-tooltip').remove();
  }
}
