import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OutgoingChecksService, OutgoingCheck } from '../../services/outgoing-checks';
import { ContactService, Contact } from '../../services/contact.service';

@Component({
  selector: 'app-outgoing-checks',
  imports: [CommonModule, FormsModule],
  templateUrl: './outgoing-checks.html',
  styleUrl: './outgoing-checks.css'
})
export class OutgoingChecksComponent implements OnInit {
  checks: OutgoingCheck[] = [];
  contacts: Contact[] = [];
  loading = false;
  error = '';
  
  // פילטרים
  filters = {
    status: '',
    payee_id: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: '',
    sort: 'created_at'
  };
  
  // סטטוסים
  statuses = [
    { value: '', label: 'הכל' },
    { value: 'pending', label: 'ממתין' },
    { value: 'cleared', label: 'נפרע' },
    { value: 'bounced', label: 'נדחה' },
    { value: 'cancelled', label: 'בוטל' },
    { value: 'expired', label: 'פג תוקף' }
  ];

  constructor(
    private outgoingChecksService: OutgoingChecksService,
    private contactService: ContactService
  ) {}

  ngOnInit() {
    this.loadChecks();
    this.loadContacts();
  }

  loadChecks() {
    this.loading = true;
    this.error = '';
    
    const params: any = {};
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.payee_id) params.payee_id = parseInt(this.filters.payee_id);
    if (this.filters.start_date) params.start_date = this.filters.start_date;
    if (this.filters.end_date) params.end_date = this.filters.end_date;
    if (this.filters.min_amount) params.min_amount = parseFloat(this.filters.min_amount);
    if (this.filters.max_amount) params.max_amount = parseFloat(this.filters.max_amount);
    if (this.filters.sort) params.sort = this.filters.sort;

    this.outgoingChecksService.getAllChecks(params).subscribe({
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

  loadContacts() {
    this.contactService.getAllContacts().subscribe({
      next: (response) => {
        this.contacts = response.data || [];
      },
      error: (err) => {
        console.error('Error loading contacts:', err);
      }
    });
  }

  applyFilters() {
    this.loadChecks();
  }

  clearFilters() {
    this.filters = {
      status: '',
      payee_id: '',
      start_date: '',
      end_date: '',
      min_amount: '',
      max_amount: '',
      sort: 'created_at'
    };
    this.loadChecks();
  }

  updateStatus(check: OutgoingCheck, newStatus: string) {
    if (newStatus === 'cancelled') {
      const reason = prompt('סיבת ביטול:');
      if (!reason) return;
      
      this.outgoingChecksService.updateStatus(check.id, newStatus, reason).subscribe({
        next: () => {
          check.status = newStatus as any;
          check.cancellation_reason = reason;
        },
        error: (err) => {
          alert('שגיאה בעדכון סטטוס');
          console.error('Error updating status:', err);
        }
      });
    } else {
      this.outgoingChecksService.updateStatus(check.id, newStatus).subscribe({
        next: () => {
          check.status = newStatus as any;
        },
        error: (err) => {
          alert('שגיאה בעדכון סטטוס');
          console.error('Error updating status:', err);
        }
      });
    }
  }

  duplicateCheck(check: OutgoingCheck) {
    this.outgoingChecksService.duplicateCheck(check.id).subscribe({
      next: (data) => {
        // כאן נוכל לפתוח טופס יצירת שק חדש עם הנתונים
        alert('שק הועתק - ניתן ליצור שק חדש עם הנתונים');
      },
      error: (err) => {
        alert('שגיאה בשכפול השק');
        console.error('Error duplicating check:', err);
      }
    });
  }

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
      currency: 'ILS'
    }).format(amount);
  }

  createNewCheck() {
    // TODO: ניווט לטופס יצירת שק חדש
    alert('פתיחת טופס יצירת שק חדש');
  }

  viewCheck(check: OutgoingCheck) {
    // TODO: ניווט לצפייה בשק
    alert(`צפייה בשק ${check.check_number}`);
  }

  cancelCheck(check: OutgoingCheck) {
    if (check.status !== 'pending') {
      alert('ניתן לבטל רק שקים במצב ממתין');
      return;
    }

    const reason = prompt('סיבת ביטול:');
    if (!reason) return;

    this.outgoingChecksService.updateStatus(check.id, 'cancelled', reason).subscribe({
      next: () => {
        check.status = 'cancelled';
        check.cancellation_reason = reason;
        alert('השק בוטל בהצלחה');
      },
      error: (err) => {
        alert('שגיאה בביטול השק');
        console.error('Error cancelling check:', err);
      }
    });
  }

  getRowClass(check: OutgoingCheck): string {
    const dueDate = new Date(check.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (check.status === 'pending') {
      if (dueDate <= weekFromNow) {
        return 'row-urgent'; // אדום - מגיע השבוע
      } else if (dueDate <= monthFromNow) {
        return 'row-warning'; // כתום - מגיע החודש
      }
    }

    return 'row-normal';
  }
}
