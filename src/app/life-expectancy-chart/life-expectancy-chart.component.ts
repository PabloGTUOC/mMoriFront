import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
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
export class LifeExpectancyChartComponent implements OnChanges, AfterViewInit {
  @Input() currentAge!: number;
  @Input() weeksLeftToLive!: number;

  /**
   * Share of the viewport height the grid may fill.
   *
   * The grid now appears twice: inline on the dashboard as the frame the rest of the page
   * sits inside, and full size in the dialog. Same component, same data, same aspect —
   * 52 columns by a life's worth of rows — so only the space it is given differs.
   */
  @Input() heightFraction = 0.8;

  @ViewChild('chart', { static: true }) chartContainer!: ElementRef<HTMLElement>;

  /** A year is always one row, so the column count is fixed and the dot size gives way. */
  private static readonly COLUMNS = 52;
  /** Centre-to-centre spacing as a multiple of the radius. */
  private static readonly SPACING_RATIO = 2.5;
  @HostListener('window:resize')
  onResize() {
    this.createChart();
  }

  private svg!: Selection<SVGGElement, unknown, null, undefined>;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentAge'] || changes['weeksLeftToLive'] || changes['heightFraction']) {
      this.createChart();
    }
  }

  /**
   * Redraw once the container has been laid out.
   *
   * `ngOnChanges` fires before the dialog that hosts this has any width, so `clientWidth`
   * reads 0 on the first pass and the radius falls back to a viewport guess. Drawing again
   * here is what makes the grid fit the panel it actually sits in.
   */
  ngAfterViewInit(): void {
    this.createChart();
  }

  /**
   * The dot radius is derived, not chosen.
   *
   * It used to be hardcoded to 5, dropping to 2 below 920px, so a full life at 52 columns
   * came to roughly 1000px tall and ran off the bottom of any screen. The grid is now
   * solved for instead: given a fixed 52 columns and the space actually available, pick the
   * largest radius that fits both the container's width and `heightFraction` of the
   * viewport height.
   */
  private createChart(): void {
    const totalWeeks = this.currentAge * 52 + this.weeksLeftToLive;
    const weeksLived = this.currentAge * 52;

    // Clear any previous SVGs
    select(this.chartContainer.nativeElement).select('svg').remove();

    const element = this.chartContainer.nativeElement;

    if (totalWeeks <= 0) return;

    const numCols = LifeExpectancyChartComponent.COLUMNS;
    const ratio = LifeExpectancyChartComponent.SPACING_RATIO;
    const numRows = Math.ceil(totalWeeks / numCols);

    // width  = radius * (ratio * numCols + 2)
    // height = radius * (ratio * numRows + 2)
    const availableWidth = element.clientWidth || window.innerWidth * 0.9;
    const availableHeight = window.innerHeight * this.heightFraction;

    const radiusForWidth = availableWidth / (ratio * numCols + 2);
    const radiusForHeight = availableHeight / (ratio * numRows + 2);
    const dotRadius = Math.max(0.75, Math.min(radiusForWidth, radiusForHeight, 6));

    const dotSpacing = dotRadius * ratio;
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

    /*
     * The class is what the stylesheet has always been written against. It was never
     * applied: the fill was set inline to the literal strings 'white' and 'green', so every
     * `.dot` / `.lived-dot` / `.remaining-dot` rule was dead and the grid rendered white and
     * green circles that belong to no part of the palette. Colour belongs in CSS, where it
     * can follow the theme.
     */
    this.svg.selectAll('circle')
      .data(dots)
      .enter()
      .append('circle')
      .attr('class', (d: Dot) => (d.lived ? 'dot dot--lived' : 'dot dot--remaining'))
      .attr('cx', (d: Dot) => d.x)
      .attr('cy', (d: Dot) => d.y)
      .attr('r', dotRadius);
  }
}
