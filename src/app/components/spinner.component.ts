import { ChangeDetectionStrategy, Component, Input, OnDestroy, ViewEncapsulation, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpProgressState, HttpStateService, IHttpState } from "../interceptor/http-state.service";



@Component({
  selector: "app-spinner",
  standalone: true,
  imports: [CommonModule],
  template: `<div class="preloader loading" *ngIf="isSpinnerVisible()">
    <div class="spinner">
      <div class="sand-watch">
        <div class="hourglass-top"></div>
        <div class="hourglass-bottom"></div>
        <div class="sand"></div>
      </div>
      <div>
        <h1
          class="font-weight-bold text-center"
          style=" padding-top: 50px; font-size: medium">
          Loading...
        </h1>
      </div>
    </div>
  </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ["./spinner.component.scss"],
})
export class SpinnerComponent implements OnDestroy {
  public readonly isSpinnerVisible = signal(false);

  @Input() public backgroundColor = "rgba(0, 115, 170, 0.69)";

  constructor(
    private httpStateService: HttpStateService
  ) {

    this.httpStateService.state.subscribe((progress: IHttpState) => {
     if (progress && progress.state === HttpProgressState.end) {
        this.isSpinnerVisible.set(false);
      }else if (progress && progress.state === HttpProgressState.start){
        this.isSpinnerVisible.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.isSpinnerVisible.set(false);
  }
}
