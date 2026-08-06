import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
// Only the two D3 modules this chart uses, rather than the whole meta-package (6.6).
import { Selection, select } from 'd3-selection';
import { range } from 'd3-array';
import { HostListener} from "@angular/core";

interface Dot {
  index: number;
  lived: boolean;
  x: number;
  y: number;
}

@Component({
  selector: 'app-life-expectancy-chart',
  standalone: true,
  templateUrl: './life-expectancy-chart.component.html',
  styleUrls: ['./life-expectancy-chart.component.scss'],
  // Redraws from ngOnChanges, not from change detection.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifeExpectancyChartComponent implements OnChanges {
  @Input() currentAge!: number;
  @Input() weeksLeftToLive!: number;

  @ViewChild('chart', { static: true }) chartContainer!: ElementRef;
  // The resize target is always the window, so the width is read from it directly rather
  // than off an untyped `$event.target`.
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth < 920) {
      // Redraw with a smaller dot so 52 columns still fit.
      this.createChart(2);
    } else {
      this.createChart(5);
    }
  }

  private svg!: Selection<SVGGElement, unknown, null, undefined>;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentAge'] || changes['weeksLeftToLive']) {
      this.createChart();
    }
  }

  private createChart(dotradius  = 5): void {
    const totalWeeks = this.currentAge * 52 + this.weeksLeftToLive;
    const weeksLived = this.currentAge * 52;

    // Clear any previous SVGs
    select(this.chartContainer.nativeElement).select('svg').remove();

    const element = this.chartContainer.nativeElement;
    const dotRadius= dotradius;
    const dotSpacing = dotRadius * 2.5;

    // Fixed number of columns to 52 (weeks in a year)
    const numCols = 52;
    const numRows = Math.ceil(totalWeeks / numCols);
    //Meter listener del resize para que las columnas
    // Calculate the actual width based on 52 columns
    const actualWidth = numCols * dotSpacing + dotRadius * 2;
    const height = numRows * dotSpacing + dotRadius * 2;

    this.svg = select(element).append('svg')
      .attr('width', actualWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${dotRadius}, ${dotRadius})`);

    const dots: Dot[] = range(totalWeeks).map((_, i) => {
      return {
        index: i,
        lived: i < weeksLived,
        x: (i % numCols) * dotSpacing,
        y: Math.floor(i / numCols) * dotSpacing
      };
    });

    this.svg.selectAll('circle')
      .data(dots)
      .enter()
      .append('circle')
      .attr('cx', (d: Dot) => d.x)
      .attr('cy', (d: Dot) => d.y)
      .attr('r', dotRadius)
      .attr('fill', (d: Dot) => d.lived ? 'white' : 'green');
  }
}
