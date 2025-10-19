import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  outgoing: {
    total_amount: number;
    pending_count: number;
    due_this_week: number;
    due_this_month: number;
    bounced_count: number;
  };
  incoming: {
    waiting_deposit_amount: number;
    waiting_deposit_count: number;
    deposited_count: number;
    cleared_count: number;
    bounced_count: number;
  };
}

export interface RecentCheck {
  type: 'outgoing' | 'incoming';
  check_number: string;
  amount: number;
  due_date: string;
  status: string;
  contact_name: string;
  created_at: string;
}

export interface UpcomingDueCheck {
  type: 'outgoing' | 'incoming';
  check_number: string;
  amount: number;
  due_date: string;
  status: string;
  contact_name: string;
  contact_phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api/dashboard';

  constructor(private http: HttpClient) { }

  // קבלת סטטיסטיקות דשבורד
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  // קבלת שקים אחרונים
  getRecentChecks(limit: number = 10): Observable<RecentCheck[]> {
    return this.http.get<RecentCheck[]>(`${this.apiUrl}/recent-checks?limit=${limit}`);
  }

  // קבלת שקים שמגיעים לפירעון בקרוב
  getUpcomingDueChecks(days: number = 7): Observable<UpcomingDueCheck[]> {
    return this.http.get<UpcomingDueCheck[]>(`${this.apiUrl}/upcoming-due?days=${days}`);
  }
}
