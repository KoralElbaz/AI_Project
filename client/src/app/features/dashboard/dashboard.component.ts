import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface CheckStats {
  total_amount: number;
  pending_count: number;
  due_this_week: number;
  due_this_month: number;
  bounced_count: number;
}

interface IncomingStats {
  waiting_deposit_amount: number;
  waiting_deposit_count: number;
  deposited_count: number;
  cleared_count: number;
  bounced_count: number;
}

interface DashboardStats {
  outgoing: CheckStats;
  incoming: IncomingStats;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    outgoing: {
      total_amount: 0,
      pending_count: 0,
      due_this_week: 0,
      due_this_month: 0,
      bounced_count: 0
    },
    incoming: {
      waiting_deposit_amount: 0,
      waiting_deposit_count: 0,
      deposited_count: 0,
      cleared_count: 0,
      bounced_count: 0
    }
  };

  isLoading = true;
  error: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.isLoading = true;
    this.error = null;

    this.http.get<DashboardStats>('http://localhost:3000/api/dashboard/stats').subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoading = false;
        console.log('Dashboard stats loaded:', data);
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.error = 'שגיאה בטעינת נתוני הדשבורד';
        this.isLoading = false;
      }
    });
  }

  // ניווט למסכים אחרים
  navigateToDashboard(): void {
    // כבר בדשבורד
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

  // פורמט מספרים
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('he-IL').format(num);
  }
}
