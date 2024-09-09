import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { FirstTimeComponent} from "./first-time/first-time.component";

const routes: Routes = [
  {
     path: '',
     redirectTo: 'home',
      pathMatch: 'full'
  },
  {
    path: 'home',
    component: MainPageComponent,
  },
  { path: 'first-time',
    component: FirstTimeComponent
  },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
