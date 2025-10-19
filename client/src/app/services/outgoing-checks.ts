import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OutgoingCheck {
  id: number;
  check_number: string;
  payee_contact_id: number;
  payee_name?: string;
  payee_phone?: string;
  payee_email?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled' | 'in_collection' | 'expired';
  is_series: boolean;
  series_id?: number;
  series_number?: number;
  is_physical: boolean;
  image_url?: string;
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OutgoingCheckStats {
  total_checks: number;
  pending_count: number;
  pending_amount: number;
  bounced_count: number;
  due_this_week: number;
  due_this_month: number;
}

export interface CreateOutgoingCheckRequest {
  check_number: string;
  payee_contact_id: number;
  amount: number;
  issue_date: string;
  due_date: string;
  is_physical?: boolean;
  notes?: string;
}

export interface CreateOutgoingSeriesRequest {
  payee_contact_id: number;
  amount: number;
  day_of_month: number;
  total_checks: number;
  start_month: string;
  check_book_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OutgoingChecksService {
  private apiUrl = 'http://localhost:3000/api/outgoing-checks';

  constructor(private http: HttpClient) { }

  // קבלת כל השקים היוצאים
  getAllChecks(params?: {
    status?: string;
    payee_id?: number;
    start_date?: string;
    end_date?: string;
    min_amount?: number;
    max_amount?: number;
    sort?: string;
  }): Observable<OutgoingCheck[]> {
    let url = this.apiUrl;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          queryParams.append(key, params[key as keyof typeof params]!.toString());
        }
      });
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    }
    return this.http.get<OutgoingCheck[]>(url);
  }

  // קבלת שק יוצא ספציפי
  getCheckById(id: number): Observable<OutgoingCheck> {
    return this.http.get<OutgoingCheck>(`${this.apiUrl}/${id}`);
  }

  // יצירת שק יוצא בודד
  createCheck(check: CreateOutgoingCheckRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, check);
  }

  // יצירת סדרת שקים
  createSeries(series: CreateOutgoingSeriesRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/series`, series);
  }

  // עדכון סטטוס שק
  updateStatus(id: number, status: string, cancellation_reason?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status, cancellation_reason });
  }

  // שכפול שק
  duplicateCheck(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  // קבלת סטטיסטיקות
  getStats(): Observable<OutgoingCheckStats> {
    return this.http.get<OutgoingCheckStats>(`${this.apiUrl}/stats`);
  }

  // יצירת שק פיזי יוצא
  createPhysicalCheck(check: {
    check_number: string;
    payee_name: string;
    amount: number;
    due_date: string;
    bank_name?: string;
    bank_branch?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/physical`, check);
  }
}
