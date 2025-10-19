import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../api/services/api.service';

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
  scheduled_deposit?: boolean;
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
  showScheduleModal = false;
  scheduledDepositDate = '';
  
  // פילטרים
  filters = {
    status: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: '',
    check_number: '',
    sort: 'due_date'
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
    private router: Router,
    private apiService: ApiService
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
    
    if (this.selectedCheck.status !== 'waiting_deposit') {
      alert('ניתן להפקיד רק שקים במצב ממתין להפקדה');
      return;
    }

    // בדיקה אם השק ניתן להפקדה - רק עבור הפקדה מיידית
    if (type === 'immediate' && !this.isCheckDepositable(this.selectedCheck)) {
      alert('לא ניתן להפקיד את השק - תאריך פירעון לא הגיע או השק פג תוקף');
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
    } else if (type === 'scheduled') {
      // הפקדה מתוזמנת - פתיחת חלון בחירת תאריך
      this.openScheduleModal(this.selectedCheck);
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

  // בדיקה אם ניתן לתזמן הפקדה
  isCheckSchedulable(check: any): boolean {
    if (!check || check.is_physical || check.status !== 'waiting_deposit') {
      return false;
    }
    
    const today = new Date();
    const dueDate = new Date(check.due_date);
    
    // רק אם תאריך הפירעון עתידי
    return dueDate > today;
  }

  // בדיקה אם יש הפקדה מתוזמנת
  hasScheduledDeposit(check: any): boolean {
    return check && check.deposit_scheduled_date;
  }

  // פתיחת חלון תזמון הפקדה
  openScheduleModal(check: any) {
    this.selectedCheck = check;
    this.scheduledDepositDate = check.due_date; // ברירת מחדל = תאריך פירעון
    this.showScheduleModal = true;
  }

  // סגירת חלון תזמון הפקדה
  closeScheduleModal() {
    this.showScheduleModal = false;
    this.scheduledDepositDate = '';
    this.selectedCheck = null;
  }

  // אישור תזמון הפקדה
  confirmScheduledDeposit() {
    if (!this.selectedCheck || !this.scheduledDepositDate) {
      return;
    }

    this.apiService.scheduleDeposit(this.selectedCheck.id, this.scheduledDepositDate).subscribe({
      next: (response) => {
        alert('הפקדה מתוזמנת נרשמה בהצלחה');
        this.closeScheduleModal();
        this.loadChecks(); // רענון רשימת השיקים
      },
      error: (error) => {
        console.error('Error scheduling deposit:', error);
        alert('שגיאה בתזמון ההפקדה: ' + (error.error?.error || error.message));
      }
    });
  }

  // ביטול הפקדה מתוזמנת
  cancelScheduledDeposit(check: any) {
    if (!confirm('האם אתה בטוח שברצונך לבטל את ההפקדה המתוזמנת?')) {
      return;
    }

    this.apiService.cancelScheduledDeposit(check.id).subscribe({
      next: (response) => {
        alert('הפקדה מתוזמנת בוטלה בהצלחה');
        this.loadChecks(); // רענון רשימת השיקים
      },
      error: (error) => {
        console.error('Error canceling scheduled deposit:', error);
        alert('שגיאה בביטול ההפקדה המתוזמנת: ' + (error.error?.error || error.message));
      }
    });
  }

  // הדפסת כל השקים
  printAllChecks() {
    if (this.checks.length === 0) {
      alert('אין שקים להדפסה');
      return;
    }

    // יצירת חלון הדפסה
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // יצירת תוכן להדפסה
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>הדפסת כל השקים הנכנסים</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            direction: rtl;
          }
          .report-header {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
          }
          .report-info {
            text-align: center;
            margin-bottom: 30px;
            color: #666;
          }
          .checks-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .checks-table th,
          .checks-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: right;
          }
          .checks-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .check-type {
            text-align: center;
          }
          .amount {
            text-align: left;
            font-weight: bold;
          }
          .status {
            text-align: center;
          }
          .summary {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
          .summary h3 {
            margin-top: 0;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px solid #ddd;
          }
          .summary-total {
            font-weight: bold;
            font-size: 18px;
            color: #2c5aa0;
            border-top: 2px solid #2c5aa0;
            margin-top: 15px;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          דוח שקים נכנסים
        </div>
        
        <div class="report-info">
          <p>תאריך הדפסה: ${new Date().toLocaleDateString('he-IL')}</p>
          <p>סה"כ שקים: ${this.checks.length}</p>
        </div>
        
        <table class="checks-table">
          <thead>
            <tr>
              <th>מס' שק</th>
              <th>שם המשלם</th>
              <th>תאריך פירעון</th>
              <th>סכום</th>
              <th>סטטוס</th>
              <th>סוג</th>
            </tr>
          </thead>
          <tbody>
            ${this.checks.map(check => `
              <tr>
                <td>${check.check_number}</td>
                <td>${check.payer_name || 'לא זמין'}</td>
                <td>${this.formatDate(check.due_date)}</td>
                <td class="amount">${this.formatAmount(check.amount)}</td>
                <td class="status">${this.getStatusLabel(this.getEffectiveStatus(check))}</td>
                <td class="check-type">${check.is_physical ? '📄 פיזי' : '💻 דיגיטלי'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <h3>סיכום</h3>
          <div class="summary-item">
            <span>סה"כ שקים:</span>
            <span>${this.checks.length}</span>
          </div>
          <div class="summary-item">
            <span>שקים דיגיטליים:</span>
            <span>${this.checks.filter(c => !c.is_physical).length}</span>
          </div>
          <div class="summary-item">
            <span>שקים פיזיים:</span>
            <span>${this.checks.filter(c => c.is_physical).length}</span>
          </div>
          <div class="summary-item">
            <span>ממתין להפקדה:</span>
            <span>${this.checks.filter(c => c.status === 'waiting_deposit').length}</span>
          </div>
          <div class="summary-item">
            <span>הופקדו:</span>
            <span>${this.checks.filter(c => c.status === 'deposited').length}</span>
          </div>
          <div class="summary-item summary-total">
            <span>סה"כ סכום:</span>
            <span>${this.formatAmount(this.checks.reduce((sum, check) => sum + check.amount, 0))}</span>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  // ייצוא לאקסל
  exportToExcel() {
    if (this.checks.length === 0) {
      alert('אין שקים לייצוא');
      return;
    }

    // יצירת נתונים לאקסל
    const csvContent = [
      ['מספר שק', 'שם המשלם', 'תאריך פירעון', 'סכום', 'סטטוס', 'סוג', 'בנק', 'סניף', 'הערות'],
      ...this.checks.map(check => [
        check.check_number,
        check.payer_name || 'לא זמין',
        this.formatDate(check.due_date),
        check.amount.toString(),
        this.getStatusLabel(this.getEffectiveStatus(check)),
        check.is_physical ? 'פיזי' : 'דיגיטלי',
        check.bank_name || 'לא זמין',
        check.bank_branch || 'לא זמין',
        check.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    // יצירת קובץ להורדה
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `שקים_נכנסים_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // הדפסת שיק בודד
  printCheck() {
    if (!this.selectedCheck) return;
    
    // פונקציות עזר להדפסה
    const formatDateForPrint = (dateString: string) => {
      if (!dateString) return 'לא זמין';
      return new Date(dateString).toLocaleDateString('he-IL');
    };
    
    const formatAmountForPrint = (amount: number) => {
      if (!amount) return '0.00 ₪';
      return `${amount.toLocaleString('he-IL')} ₪`;
    };
    
    const getStatusLabelForPrint = (status: string) => {
      const statusMap: { [key: string]: string } = {
        'waiting_deposit': 'ממתין להפקדה',
        'deposited': 'הופקד',
        'cleared': 'נפרע',
        'bounced': 'נדחה',
        'endorsed': 'הועבר',
        'expired': 'פג תוקף',
        'cancelled': 'בוטל'
      };
      return statusMap[status] || status;
    };
    
    // יצירת חלון הדפסה
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // יצירת תוכן להדפסה
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>הדפסת שיק נכנס</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            direction: rtl;
          }
          .check-header {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .check-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          .detail-label {
            font-weight: bold;
          }
          .check-amount {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #2c5aa0;
            margin: 20px 0;
            padding: 15px;
            border: 2px solid #2c5aa0;
            border-radius: 8px;
          }
          .check-status {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            color: #28a745;
            margin: 15px 0;
          }
          .check-notes {
            margin-top: 20px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .check-type {
            text-align: center;
            font-size: 14px;
            margin: 10px 0;
            padding: 5px;
            background-color: #e9ecef;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="check-header">
          שיק נכנס - ${this.selectedCheck.check_number}
        </div>
        
        <div class="check-type">
          ${this.selectedCheck.is_physical ? '📄 שיק פיזי' : '💻 שיק דיגיטלי'}
        </div>
        
        <div class="check-details">
          <div class="detail-item">
            <span class="detail-label">מספר שיק:</span>
            <span>${this.selectedCheck.check_number}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">שם המשלם:</span>
            <span>${this.selectedCheck.payer_name || 'לא זמין'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">תאריך פירעון:</span>
            <span>${formatDateForPrint(this.selectedCheck.due_date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">תאריך יצירה:</span>
            <span>${formatDateForPrint(this.selectedCheck.issue_date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">בנק:</span>
            <span>${this.selectedCheck.bank_name || 'לא זמין'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">סניף:</span>
            <span>${this.selectedCheck.bank_branch || 'לא זמין'}</span>
          </div>
        </div>
        
        <div class="check-amount">
          ${formatAmountForPrint(this.selectedCheck.amount)}
        </div>
        
        <div class="check-status">
          סטטוס: ${getStatusLabelForPrint(this.selectedCheck.status)}
        </div>
        
        ${this.selectedCheck.deposit_scheduled_date ? `
          <div class="check-notes">
            <strong>הפקדה מתוזמנת:</strong> ${formatDateForPrint(this.selectedCheck.deposit_scheduled_date)}
          </div>
        ` : ''}
        
        ${this.selectedCheck.notes ? `
          <div class="check-notes">
            <strong>הערות:</strong><br>
            ${this.selectedCheck.notes}
          </div>
        ` : ''}
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  // קבלת התאריך המקסימלי לתזמון הפקדה (6 חודשים מתאריך פירעון)
  getMaxScheduleDate(): string {
    if (!this.selectedCheck) return '';
    
    const dueDate = new Date(this.selectedCheck.due_date);
    const maxDate = new Date(dueDate);
    maxDate.setMonth(maxDate.getMonth() + 6);
    
    return maxDate.toISOString().split('T')[0];
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
    // רק שיקים דיגיטליים יקבלו צבע ירוק בהיר
    if (!check.is_physical) {
      return 'row-digital';
    }

    return 'row-normal';
  }

}