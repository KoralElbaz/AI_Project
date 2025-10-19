import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  constructor(private router: Router) {}

  // ניווט למסכים אחרים
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToOutgoingChecks(): void {
    this.router.navigate(['/outgoing-checks']);
  }

  navigateToIncomingChecks(): void {
    this.router.navigate(['/incoming-checks']);
  }

  navigateToCreateCheck(): void {
    this.router.navigate(['/create-check']);
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}
