import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncomingChecksService, IncomingCheck } from '../../services/incoming-checks';
import { ContactService, Contact } from '../../services/contact.service';

@Component({
  selector: 'app-incoming-checks',
  imports: [CommonModule, FormsModule],
  templateUrl: './incoming-checks.html',
  styleUrl: './incoming-checks.css'
})
export class IncomingChecksComponent implements OnInit {
  checks: IncomingCheck[] = [];
  contacts: Contact[] = [];
  loading = false;
  error = '';
  
  // פילטרים
  filters = {
    status: '',
    payer_id: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: '',
    sort: 'created_at'
  };
  
  // סטטוסים
  statuses = [
    { value: '', label: 'הכל' },
    { value: 'waiting_deposit', label: 'ממתין להפקדה' },
    { value: 'deposited', label: 'הופקד' },
    { value: 'cleared', label: 'נפרע' },
    { value: 'bounced', label: 'נדחה' },
    { value: 'expired', label: 'פג תוקף' },
    { value: 'cancelled', label: 'בוטל' }
  ];

  constructor(
    private incomingChecksService: IncomingChecksService,
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
    if (this.filters.payer_id) params.payer_id = parseInt(this.filters.payer_id);
    if (this.filters.start_date) params.start_date = this.filters.start_date;
    if (this.filters.end_date) params.end_date = this.filters.end_date;
    if (this.filters.min_amount) params.min_amount = parseFloat(this.filters.min_amount);
    if (this.filters.max_amount) params.max_amount = parseFloat(this.filters.max_amount);
    if (this.filters.sort) params.sort = this.filters.sort;

    this.incomingChecksService.getAllChecks(params).subscribe({
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
      payer_id: '',
      start_date: '',
      end_date: '',
      min_amount: '',
      max_amount: '',
      sort: 'created_at'
    };
    this.loadChecks();
  }

  depositCheck(check: IncomingCheck) {
    if (check.status !== 'waiting_deposit') {
      alert('ניתן להפקיד רק שקים במצב "ממתין להפקדה"');
      return;
    }

    this.incomingChecksService.depositCheck(check.id).subscribe({
      next: () => {
        check.status = 'deposited';
        check.deposited_at = new Date().toISOString();
        alert('השק הופקד בהצלחה');
      },
      error: (err) => {
        alert(err.error?.error || 'שגיאה בהפקדת השק');
        console.error('Error depositing check:', err);
      }
    });
  }

  scheduleDeposit(check: IncomingCheck) {
    const depositDate = prompt('תאריך הפקדה מתוזמן (YYYY-MM-DD):');
    if (!depositDate) return;

    this.incomingChecksService.scheduleDeposit(check.id, depositDate).subscribe({
      next: () => {
        check.deposit_scheduled_date = depositDate;
        alert('הפקדה מתוזמנת בהצלחה');
      },
      error: (err) => {
        alert('שגיאה בתזמון ההפקדה');
        console.error('Error scheduling deposit:', err);
      }
    });
  }

  issueInvoice(check: IncomingCheck) {
    const invoiceNumber = prompt('מספר חשבונית:');
    if (!invoiceNumber) return;

    this.incomingChecksService.issueInvoice(check.id, invoiceNumber).subscribe({
      next: () => {
        check.invoice_number = invoiceNumber;
        check.invoice_issued_at = new Date().toISOString();
        alert('חשבונית הונפקה בהצלחה');
      },
      error: (err) => {
        alert('שגיאה בהוצאת החשבונית');
        console.error('Error issuing invoice:', err);
      }
    });
  }

  updateStatus(check: IncomingCheck, newStatus: string) {
    if (newStatus === 'cancelled') {
      const reason = prompt('סיבת ביטול:');
      if (!reason) return;
      
      this.incomingChecksService.updateStatus(check.id, newStatus, reason).subscribe({
        next: () => {
          check.status = newStatus as any;
        },
        error: (err) => {
          alert('שגיאה בעדכון סטטוס');
          console.error('Error updating status:', err);
        }
      });
    } else {
      this.incomingChecksService.updateStatus(check.id, newStatus).subscribe({
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
      currency: 'ILS'
    }).format(amount);
  }

  createNewCheck() {
    // TODO: ניווט לטופס יצירת שק חדש
    alert('פתיחת טופס יצירת שק נכנס חדש');
  }

  viewCheck(check: IncomingCheck) {
    // TODO: ניווט לצפייה בשק
    alert(`צפייה בשק ${check.check_number}`);
  }

  getRowClass(check: IncomingCheck): string {
    const dueDate = new Date(check.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (check.status === 'waiting_deposit' || check.status === 'deposited') {
      if (dueDate <= weekFromNow) {
        return 'row-urgent'; // אדום - מגיע השבוע
      } else if (dueDate <= monthFromNow) {
        return 'row-warning'; // כתום - מגיע החודש
      }
    }

    return 'row-normal';
  }

  cancelCheck(check: IncomingCheck) {
    if (check.status === 'cancelled') {
      alert('השק כבר בוטל');
      return;
    }

    const reason = prompt('סיבת ביטול:');
    if (!reason) return;

    this.incomingChecksService.updateStatus(check.id, 'cancelled', reason).subscribe({
      next: () => {
        check.status = 'cancelled';
        alert('השק בוטל בהצלחה');
      },
      error: (err) => {
        alert('שגיאה בביטול השק');
        console.error('Error cancelling check:', err);
      }
    });
  }
}
