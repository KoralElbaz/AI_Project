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
    sort: 'due_date'
  };
  
  // סטטוסים
  statuses = [
    { value: '', label: 'כל הסטטוסים' },
    { value: 'pending', label: 'ממתין לפירעון' },
    { value: 'cleared', label: 'נפרע' },
    { value: 'bounced', label: 'נדחה' },
    { value: 'cancelled', label: 'בוטל' },
    { value: 'in_collection', label: 'בהעברה' },
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
    if (this.isCheckExpired(check) && check.status === 'pending') {
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
    
    // בדיקה שהשק במצב ממתין לפירעון
    if (this.selectedCheck.status !== 'pending') {
      alert('לא ניתן לבטל שק שלא במצב ממתין לפירעון');
      return;
    }

    // אישור ביטול
    const confirmed = confirm(`האם אתה בטוח שברצונך למחוק את השק ${this.selectedCheck.check_number}?`);
    if (!confirmed) return;

    // מחיקה מהמסד נתונים
    this.http.delete(`http://localhost:3000/api/outgoing-checks/${this.selectedCheck.id}`).subscribe({
      next: () => {
        // סגירת החלונית
        this.expandedRowId = null;
        this.selectedCheck = null;
        
        // רענון הרשימה
        this.loadChecks();
        
        // הודעת הצלחה
        alert('השק בוטל ונמחק בהצלחה');
      },
      error: (err) => {
        alert('שגיאה במחיקת השק');
        console.error('Error deleting check:', err);
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
        <title>הדפסת כל השקים היוצאים</title>
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
          דוח שקים יוצאים
        </div>
        
        <div class="report-info">
          <p>תאריך הדפסה: ${new Date().toLocaleDateString('he-IL')}</p>
          <p>סה"כ שקים: ${this.checks.length}</p>
        </div>
        
        <table class="checks-table">
          <thead>
            <tr>
              <th>מס' שק</th>
              <th>שם המוטב</th>
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
                <td>${check.payee_name || 'לא זמין'}</td>
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
            <span>ממתין לפירעון:</span>
            <span>${this.checks.filter(c => c.status === 'pending').length}</span>
          </div>
          <div class="summary-item">
            <span>נפרעו:</span>
            <span>${this.checks.filter(c => c.status === 'cleared').length}</span>
          </div>
          <div class="summary-item">
            <span>בוטלו:</span>
            <span>${this.checks.filter(c => c.status === 'cancelled').length}</span>
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
      ['מספר שק', 'שם המוטב', 'תאריך פירעון', 'סכום', 'סטטוס', 'סוג', 'בנק', 'סניף', 'הערות'],
      ...this.checks.map(check => [
        check.check_number,
        check.payee_name || 'לא זמין',
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
    link.setAttribute('download', `שקים_יוצאים_${new Date().toISOString().split('T')[0]}.csv`);
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
        'pending': 'ממתין לפירעון',
        'cleared': 'נפרע',
        'bounced': 'נדחה',
        'cancelled': 'בוטל',
        'in_collection': 'בהעברה',
        'expired': 'פג תוקף'
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
        <title>הדפסת שק יוצא</title>
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
          שיק יוצא - ${this.selectedCheck.check_number}
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
            <span class="detail-label">שם המוטב:</span>
            <span>${this.selectedCheck.payee_name || 'לא זמין'}</span>
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
        
        ${this.selectedCheck.cancellation_reason ? `
          <div class="check-notes">
            <strong>סיבת ביטול:</strong><br>
            ${this.selectedCheck.cancellation_reason}
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

  duplicateCheck() {
    if (!this.selectedCheck) return;
    
    // בדיקה אם זה שק פיזי - הגבלת פעולות
    if (this.selectedCheck.is_physical) {
      alert('לא ניתן לבצע פעולות על שיק פיזי - זה מיועד למעקב בלבד');
      return;
    }
    
    // יצירת מספר שק חדש
    const newCheckNumber = this.generateNewCheckNumber();
    
    // הכנת פרמטרים לניווט למסך יצירת שיק
    const queryParams = {
      type: 'outgoing',
      duplicate: 'true',
      check_number: newCheckNumber,
      contact_id: this.selectedCheck.payee_contact_id,
      amount: this.selectedCheck.amount,
      notes: this.selectedCheck.notes,
      bank_name: this.selectedCheck.bank_name || '',
      bank_branch: this.selectedCheck.bank_branch || ''
    };
    
    // סגירת החלונית הנוכחית
    this.expandedRowId = null;
    this.selectedCheck = null;
    
    // ניווט למסך יצירת שיק עם הפרמטרים
    this.router.navigate(['/create-check'], { queryParams });
  }

  // יצירת מספר שק חדש
  generateNewCheckNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
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
    // רק שיקים דיגיטליים יקבלו צבע ירוק בהיר
    if (!check.is_physical) {
      return 'row-digital';
    }

    return 'row-normal';
  }
}