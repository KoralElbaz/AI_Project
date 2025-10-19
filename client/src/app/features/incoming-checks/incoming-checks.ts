import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface IncomingCheck {
  id: number;
  check_number: string;
  payer_contact_id: number;
  payer_name: string;
  payer_phone: string;
  payer_email: string;
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
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  proxy?: string;
}

@Component({
  selector: 'app-incoming-checks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incoming-checks.html',
  styleUrl: './incoming-checks.css'
})
export class IncomingChecksComponent implements OnInit {
  checks: IncomingCheck[] = [];
  loading = false;
  error = '';
  selectedCheck: IncomingCheck | null = null;
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
    { value: 'waiting_deposit', label: 'ממתין להפקדה' },
    { value: 'deposited', label: 'הופקד' },
    { value: 'cleared', label: 'נפרע' },
    { value: 'bounced', label: 'נדחה' },
    { value: 'endorsed', label: 'הועבר' },
    { value: 'expired', label: 'פג תוקף' },
    { value: 'cancelled', label: 'בוטל' }
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

    this.http.get<IncomingCheck[]>('http://localhost:3000/api/incoming-checks', { params }).subscribe({
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

  // בדיקה אם שיק פג תוקף
  isCheckExpired(check: any): boolean {
    if (!check || check.is_physical) return false;
    
    const today = new Date();
    const dueDate = new Date(check.due_date);
    const sixMonthsFromDue = new Date(dueDate);
    sixMonthsFromDue.setMonth(sixMonthsFromDue.getMonth() + 6);
    
    return today > sixMonthsFromDue;
  }

  // קבלת סטטוס מעודכן של השק
  getEffectiveStatus(check: any): string {
    if (this.isCheckExpired(check) && check.status === 'waiting_deposit') {
      return 'expired';
    }
    return check.status;
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
        type: 'incoming', 
        isPhysical: 'true' 
      } 
    });
  }

  // Drawer
  toggleRowExpansion(check: IncomingCheck) {
    if (this.expandedRowId === check.id) {
      this.expandedRowId = null;
      this.selectedCheck = null;
    } else {
      this.expandedRowId = check.id;
      this.selectedCheck = check;
    }
  }

  isRowExpanded(check: IncomingCheck): boolean {
    return this.expandedRowId === check.id;
  }

  // פעולות על שק
  issueInvoice() {
    if (!this.selectedCheck) return;
    
    // עבור שיקים פיזיים ודיגיטליים - הוצאת חשבונית מותרת
    const invoiceNumber = prompt('מספר חשבונית:');
    if (!invoiceNumber) return;

    this.http.post(`http://localhost:3000/api/incoming-checks/${this.selectedCheck.id}/invoice`, {
      invoice_number: invoiceNumber
    }).subscribe({
      next: () => {
        this.selectedCheck!.invoice_number = invoiceNumber;
        this.selectedCheck!.invoice_issued_at = new Date().toISOString();
        this.loadChecks(); // רענון הרשימה
        alert('חשבונית הונפקה בהצלחה');
      },
      error: (err) => {
        alert('שגיאה בהוצאת החשבונית');
        console.error('Error issuing invoice:', err);
      }
    });
  }

  depositCheck(type: 'immediate' | 'scheduled' = 'immediate') {
    if (!this.selectedCheck) return;
    
    // בדיקה אם זה שק פיזי - הגבלת פעולות
    if (this.selectedCheck.is_physical) {
      alert('לא ניתן לבצע פעולות על שיק פיזי - זה מיועד למעקב בלבד');
      return;
    }
    
    // בדיקה אם השק ניתן להפקדה
    if (!this.isCheckDepositable(this.selectedCheck)) {
      alert('לא ניתן להפקיד את השק - תאריך פירעון לא הגיע או השק פג תוקף');
      return;
    }
    
    if (this.selectedCheck.status !== 'waiting_deposit') {
      alert('ניתן להפקיד רק שקים במצב ממתין להפקדה');
      return;
    }

    if (type === 'immediate') {
      this.http.put(`http://localhost:3000/api/incoming-checks/${this.selectedCheck.id}/deposit`, {}).subscribe({
        next: () => {
          this.selectedCheck!.status = 'deposited';
          this.selectedCheck!.deposited_at = new Date().toISOString();
          this.loadChecks(); // רענון הרשימה
          alert('השק הופקד בהצלחה');
        },
        error: (err) => {
          alert('שגיאה בהפקדת השק');
          console.error('Error depositing check:', err);
        }
      });
    } else {
      const depositDate = prompt('תאריך הפקדה (YYYY-MM-DD):');
      if (!depositDate) return;

      this.http.put(`http://localhost:3000/api/incoming-checks/${this.selectedCheck.id}/schedule-deposit`, {
        deposit_date: depositDate
      }).subscribe({
        next: () => {
          this.selectedCheck!.deposit_scheduled_date = depositDate;
          this.loadChecks(); // רענון הרשימה
          alert('הפקדה מתוזמנת בהצלחה');
        },
        error: (err) => {
          alert('שגיאה בתזמון ההפקדה');
          console.error('Error scheduling deposit:', err);
        }
      });
    }
  }

  // בדיקה אם השק ניתן להפקדה
  isCheckDepositable(check: any): boolean {
    if (!check || check.is_physical) {
      return false;
    }

    const today = new Date();
    const dueDate = new Date(check.due_date);
    
    // שק ניתן להפקדה רק מתאריך הפירעון ועד חצי שנה קדימה
    const sixMonthsFromDue = new Date(dueDate);
    sixMonthsFromDue.setMonth(sixMonthsFromDue.getMonth() + 6);
    
    return today >= dueDate && today <= sixMonthsFromDue;
  }

  // קבלת הודעת כלי עבור כפתור ההפקדה
  getDepositButtonTooltip(check: any): string {
    if (!check || check.is_physical) {
      return 'לא ניתן להפקיד שק פיזי';
    }

    const today = new Date();
    const dueDate = new Date(check.due_date);
    const sixMonthsFromDue = new Date(dueDate);
    sixMonthsFromDue.setMonth(sixMonthsFromDue.getMonth() + 6);

    if (today < dueDate) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `השק ניתן להפקדה בעוד ${daysUntilDue} ימים (תאריך פירעון: ${this.formatDate(check.due_date)})`;
    } else if (today > sixMonthsFromDue) {
      return `השק פג תוקף - ניתן היה להפקיד עד ${this.formatDate(sixMonthsFromDue.toISOString().split('T')[0])}`;
    } else {
      return `השק ניתן להפקדה (תאריך פירעון: ${this.formatDate(check.due_date)})`;
    }
  }

  // קבלת הודעה עבור סטטוס השק
  getStatusNotice(check: any): string {
    if (!check) return '';

    // בדיקה אם השק פג תוקף
    if (this.isCheckExpired(check) && check.status === 'waiting_deposit') {
      return 'השק פג תוקף - לא ניתן לבצע הפקדה נוספת';
    }

    switch (check.status) {
      case 'deposited':
        return 'השק הופקד - לא ניתן לבצע הפקדה נוספת';
      case 'cleared':
        return 'השק נפרע - לא ניתן לבצע הפקדה נוספת';
      case 'bounced':
        return 'השק הוחזר - לא ניתן לבצע הפקדה נוספת';
      case 'endorsed':
        return 'השק הועבר - לא ניתן לבצע הפקדה נוספת';
      case 'expired':
        return 'השק פג תוקף - לא ניתן לבצע הפקדה נוספת';
      case 'cancelled':
        return 'השק בוטל - לא ניתן לבצע הפקדה נוספת';
      default:
        return 'לא ניתן לבצע הפקדה עבור סטטוס זה';
    }
  }


  // פורמט
  getStatusLabel(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'waiting_deposit': return 'status-waiting';
      case 'deposited': return 'status-deposited';
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
  getCheckMarks(check: IncomingCheck): string[] {
    const marks = [];
    
    if (check.status === 'cleared') {
      marks.push('✅ נפרע');
    } else if (check.status === 'bounced') {
      marks.push('⚠️ חזר');
    } else if (check.status === 'cancelled') {
      marks.push('🚫 בוטל');
    } else if (check.status === 'deposited') {
      marks.push('📥 הופקד');
    } else {
      marks.push('⏳ לא הופקד');
    }
    
    if (check.is_physical) {
      marks.push('📄 פיזי');
    } else {
      marks.push('💻 דיגיטלי');
    }
    
    return marks;
  }

  // CSS classes
  getRowClass(check: IncomingCheck): string {
    const dueDate = new Date(check.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (check.status === 'waiting_deposit' && dueDate <= weekFromNow) {
      return 'row-urgent';
    }

    return 'row-normal';
  }
}