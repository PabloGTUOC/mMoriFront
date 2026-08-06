import { Component, Input, OnInit, OnChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
// Only the D3 modules this chart uses, rather than the whole meta-package (6.6).
import { select, selectAll } from 'd3-selection';
import { extent, max, min } from 'd3-array';
import { scaleLinear, scaleTime } from 'd3-scale';
import { curveMonotoneX, line as d3Line } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { WeightHistory } from '../../models';

@Component({
  selector: 'app-weight-history-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="weight-chart-container">
      <h3>Weight History</h3>
      <div #chart class="chart"></div>
      <p *ngIf="!weightData || weightData.length === 0" class="no-data">
        No weight data available yet. Start logging your weight to see trends!
      </p>
    </div>
  `,
  styles: [`
    .weight-chart-container {
      padding: 20px;
      background: var(--card-background);
      border-radius: 10px;
      box-shadow: var(--shadow-md);
      margin: 20px 0;
    }

    h3 {
      margin-top: 0;
      color: var(--text-primary);
      text-align: center;
    }

    .chart {
      width: 100%;
      min-height: 300px;
    }

    .no-data {
      text-align: center;
      color: var(--text-secondary);
      font-style: italic;
    }
  `]
})
export class WeightHistoryChartComponent implements OnInit, OnChanges {
  @Input() weightData: WeightHistory[] = [];
  @ViewChild('chart', { static: false }) chartElement!: ElementRef;

  private svg: any;
  private margin = { top: 20, right: 30, bottom: 50, left: 60 };
  private width = 0;
  private height = 300;

  ngOnInit(): void {
    this.createChart();
  }

  ngOnChanges(): void {
    if (this.chartElement && this.weightData && this.weightData.length > 0) {
      this.updateChart();
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

    // Parse dates
    const data = this.weightData.map(d => ({
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
    const line = d3Line<{date: Date, weight: number}>()
      .x(d => x(d.date))
      .y(d => y(d.weight))
      .curve(curveMonotoneX);

    // Clear previous content
    this.svg.selectAll('*').remove();

    // Add grid lines
    this.svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(axisLeft(y)
        .tickSize(-this.width)
        .tickFormat(() => '')
      );

    // Add line path
    this.svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary-color)')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add dots
    this.svg.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d: any) => x(d.date))
      .attr('cy', (d: any) => y(d.weight))
      .attr('r', 5)
      .attr('fill', 'var(--primary-color)')
      .attr('stroke', 'var(--card-background)')
      .attr('stroke-width', 2)
      .on('mouseover', (event: any, d: any) => {
        select(event.currentTarget)
          .attr('r', 8)
          .attr('fill', 'var(--primary-light)');

        // Show tooltip
        this.showTooltip(event, d);
      })
      .on('mouseout', (event: any) => {
        select(event.currentTarget)
          .attr('r', 5)
          .attr('fill', 'var(--primary-color)');

        this.hideTooltip();
      });

    // Add X axis
    this.svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(axisBottom(x).ticks(5))
      .attr('color', 'var(--text-secondary)');

    // Add Y axis
    this.svg.append('g')
      .call(axisLeft(y).ticks(5))
      .attr('color', 'var(--text-secondary)');

    // Add axis labels
    this.svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - this.margin.left)
      .attr('x', 0 - (this.height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-primary)')
      .text('Weight (kg)');

    this.svg.append('text')
      .attr('transform', `translate(${this.width / 2},${this.height + this.margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('fill', 'var(--text-primary)')
      .text('Date');
  }

  private showTooltip(event: any, d: any): void {
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
