import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { FirstTimeComponent} from "./first-time/first-time.component";
import { AuthGuard } from './guards/auth.guard';
import { NewUserGuard } from './guards/new-user.guard';

const routes: Routes = [
  {
     path: '',
     redirectTo: 'home',
      pathMatch: 'full'
  },
  {
    path: 'home',
    component: MainPageComponent,
    canActivate: [AuthGuard, NewUserGuard]
  },
  {
    path: 'first-time',
    component: FirstTimeComponent,
    canActivate: [AuthGuard]
  },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
