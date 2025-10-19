import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IncomingCheck {
  id: number;
  check_number: string;
  payer_contact_id: number;
  payer_name?: string;
  payer_phone?: string;
  payer_email?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: 'waiting_deposit' | 'deposited' | 'cleared' | 'bounced' | 'endorsed' | 'expired' | 'cancelled';
  deposited_at?: string;
  deposit_scheduled_date?: string;
  cleared_at?: string;
  is_series: boolean;
  series_id?: number;
  series_number?: number;
  is_physical: boolean;
  image_url?: string;
  invoice_number?: string;
  invoice_issued_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IncomingCheckStats {
  waiting_deposit_amount: number;
  waiting_deposit_count: number;
  deposited_count: number;
  cleared_count: number;
  bounced_count: number;
}

export interface CreateIncomingCheckRequest {
  check_number: string;
  payer_contact_id: number;
  amount: number;
  issue_date: string;
  due_date: string;
  is_physical?: boolean;
  notes?: string;
}

export interface CreateIncomingSeriesRequest {
  payer_contact_id: number;
  amount: number;
  day_of_month: number;
  total_checks: number;
  start_month: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncomingChecksService {
  private apiUrl = 'http://localhost:3000/api/incoming-checks';

  constructor(private http: HttpClient) { }

  // קבלת כל השקים הנכנסים
  getAllChecks(params?: {
    status?: string;
    payer_id?: number;
    start_date?: string;
    end_date?: string;
    min_amount?: number;
    max_amount?: number;
    sort?: string;
  }): Observable<IncomingCheck[]> {
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
    return this.http.get<IncomingCheck[]>(url);
  }

  // קבלת שק נכנס ספציפי
  getCheckById(id: number): Observable<IncomingCheck> {
    return this.http.get<IncomingCheck>(`${this.apiUrl}/${id}`);
  }

  // יצירת שק נכנס בודד
  createCheck(check: CreateIncomingCheckRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, check);
  }

  // יצירת סדרת שקים נכנסים
  createSeries(series: CreateIncomingSeriesRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/series`, series);
  }

  // הפקדת שק
  depositCheck(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/deposit`, {});
  }

  // תזמון הפקדה
  scheduleDeposit(id: number, deposit_date: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/schedule-deposit`, { deposit_date });
  }

  // הוצאת חשבונית
  issueInvoice(id: number, invoice_number: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/invoice`, { invoice_number });
  }

  // עדכון סטטוס שק
  updateStatus(id: number, status: string, cancellation_reason?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status, cancellation_reason });
  }

  // קבלת סטטיסטיקות
  getStats(): Observable<IncomingCheckStats> {
    return this.http.get<IncomingCheckStats>(`${this.apiUrl}/stats`);
  }
}
