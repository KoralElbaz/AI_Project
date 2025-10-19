import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './features/home/home.component';
import { OutgoingChecksComponent } from './features/outgoing-checks/outgoing-checks';
import { IncomingChecksComponent } from './features/incoming-checks/incoming-checks';
import { CreateCheckComponent } from './features/create-check/create-check';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'outgoing-checks', component: OutgoingChecksComponent },
  { path: 'incoming-checks', component: IncomingChecksComponent },
  { path: 'create-check', component: CreateCheckComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
