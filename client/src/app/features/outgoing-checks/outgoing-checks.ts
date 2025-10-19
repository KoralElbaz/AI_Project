import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface OutgoingCheck {
  id: number;
  check_number: string;
  payee_contact_id: number;
  payee_name: string;
  payee_phone: string;
  payee_email: string;
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
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  proxy?: string;
}

@Component({
  selector: 'app-outgoing-checks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outgoing-checks.html',
  styleUrl: './outgoing-checks.css'
})
export class OutgoingChecksComponent implements OnInit {
  checks: OutgoingCheck[] = [];
  loading = false;
  error = '';
  selectedCheck: OutgoingCheck | null = null;
  expandedRowId: number | null = null;
  
  // פילטרים
  filters = {
    status: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: '',
    check_number: '',
    sort: 'created_at'
  };
  
  // סטטוסים
  statuses = [
    { value: '', label: 'כל הסטטוסים' },
    { value: 'pending', label: 'ממתין לפירעון' },
    { value: 'cleared', label: 'נפרע' },
    { value: 'bounced', label: 'נדחה' },
    { value: 'cancelled', label: 'בוטל' },
    { value: 'expired', label: 'פג תוקף' }
  ];

  // תאריכים
  dateRanges = [
    { value: '7', label: '7 ימים' },
    { value: '30', label: '30 ימים אחרונים' },
    { value: '90', label: '90 ימים' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadChecks();
  }

  loadChecks() {
    this.loading = true;
    this.error = '';
    
    const params: any = {};
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.start_date) params.start_date = this.filters.start_date;
    if (this.filters.end_date) params.end_date = this.filters.end_date;
    if (this.filters.min_amount) params.min_amount = parseFloat(this.filters.min_amount);
    if (this.filters.max_amount) params.max_amount = parseFloat(this.filters.max_amount);
    if (this.filters.check_number) params.check_number = this.filters.check_number;
    if (this.filters.sort) params.sort = this.filters.sort;

    this.http.get<OutgoingCheck[]>('http://localhost:3000/api/outgoing-checks', { params }).subscribe({
      next: (data) => {
        this.checks = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'שגיאה בטעינת השקים';
        this.loading = false;
        console.error('Error loading checks:', err);
      }
    });
  }

  applyFilters() {
    this.loadChecks();
  }

  clearFilters() {
    this.filters = {
      status: '',
      start_date: '',
      end_date: '',
      min_amount: '',
      max_amount: '',
      check_number: '',
      sort: 'created_at'
    };
    this.loadChecks();
  }

  // בדיקה אם יש פילטרים פעילים
  hasActiveFilters(): boolean {
    return !!(
      this.filters.status ||
      this.filters.start_date ||
      this.filters.end_date ||
      this.filters.min_amount ||
      this.filters.max_amount ||
      this.filters.check_number
    );
  }

  // ניווט
  goBackToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  navigateToCreateCheck() {
    this.router.navigate(['/create-check']);
  }

  addPhysicalCheck() {
    // פתיחת מסך יצירת שק עם סוג פיזי
    this.router.navigate(['/create-check'], { 
      queryParams: { 
        type: 'outgoing', 
        isPhysical: 'true' 
      } 
    });
  }

  // Drawer
  toggleRowExpansion(check: OutgoingCheck) {
    if (this.expandedRowId === check.id) {
      this.expandedRowId = null;
      this.selectedCheck = null;
    } else {
      this.expandedRowId = check.id;
      this.selectedCheck = check;
    }
  }

  isRowExpanded(check: OutgoingCheck): boolean {
    return this.expandedRowId === check.id;
  }

  // פעולות על שק
  cancelCheck() {
    if (!this.selectedCheck) return;
    
    // בדיקה אם זה שק פיזי - הגבלת פעולות
    if (this.selectedCheck.is_physical) {
      alert('לא ניתן לבצע פעולות על שיק פיזי - זה מיועד למעקב בלבד');
      return;
    }
    
    if (this.selectedCheck.status !== 'pending') {
      alert('ניתן לבטל רק שקים במצב ממתין לפירעון');
      return;
    }

    const reason = prompt('סיבת ביטול:');
    if (!reason) return;

    this.http.put(`http://localhost:3000/api/outgoing-checks/${this.selectedCheck.id}/status`, {
      status: 'cancelled',
      cancellation_reason: reason
    }).subscribe({
      next: () => {
        this.selectedCheck!.status = 'cancelled';
        this.selectedCheck!.cancellation_reason = reason;
        this.loadChecks(); // רענון הרשימה
        alert('השק בוטל בהצלחה');
      },
      error: (err) => {
        alert('שגיאה בביטול השק');
        console.error('Error cancelling check:', err);
      }
    });
  }

  printCheck() {
    if (!this.selectedCheck) return;
    
    // בדיקה אם זה שק פיזי - הגבלת פעולות
    if (this.selectedCheck.is_physical) {
      alert('לא ניתן לבצע פעולות על שיק פיזי - זה מיועד למעקב בלבד');
      return;
    }
    alert(`הדפסת שק ${this.selectedCheck.check_number}`);
    // כאן תוכל להוסיף לוגיקה להדפסה
  }

  duplicateCheck() {
    if (!this.selectedCheck) return;
    
    // בדיקה אם זה שק פיזי - הגבלת פעולות
    if (this.selectedCheck.is_physical) {
      alert('לא ניתן לבצע פעולות על שיק פיזי - זה מיועד למעקב בלבד');
      return;
    }
    
    this.http.post(`http://localhost:3000/api/outgoing-checks/${this.selectedCheck.id}/duplicate`, {}).subscribe({
      next: (data: any) => {
        alert('שק הועתק - ניתן ליצור שק חדש עם הנתונים');
        // כאן תוכל לפתוח טופס יצירת שק חדש עם הנתונים
      },
      error: (err) => {
        alert('שגיאה בשכפול השק');
        console.error('Error duplicating check:', err);
      }
    });
  }

  // פורמט
  getStatusLabel(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'cleared': return 'status-cleared';
      case 'bounced': return 'status-bounced';
      case 'cancelled': return 'status-cancelled';
      case 'expired': return 'status-expired';
      default: return 'status-default';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('he-IL');
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // סימונים
  getCheckMarks(check: OutgoingCheck): string[] {
    const marks = [];
    
    if (check.status === 'cleared') {
      marks.push('✅ נפרע');
    } else if (check.status === 'bounced') {
      marks.push('⚠️ חזר');
    } else if (check.status === 'cancelled') {
      marks.push('🚫 בוטל');
    } else {
      marks.push('❌ לא נפרע');
    }
    
    if (check.is_physical) {
      marks.push('📄 פיזי');
    } else {
      marks.push('💻 דיגיטלי');
    }
    
    return marks;
  }

  // CSS classes
  getRowClass(check: OutgoingCheck): string {
    const dueDate = new Date(check.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (check.status === 'pending' && dueDate <= weekFromNow) {
      return 'row-urgent';
    }

    return 'row-normal';
  }
}