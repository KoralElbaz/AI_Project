import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OutgoingChecksService } from '../../services/outgoing-checks';
import { IncomingChecksService } from '../../services/incoming-checks';
import { ContactService, Contact } from '../../services/contact.service';

@Component({
  selector: 'app-create-check',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-check.html',
  styleUrl: './create-check.css'
})
export class CreateCheckComponent implements OnInit {
  checkType: 'outgoing' | 'incoming' = 'outgoing';
  contacts: Contact[] = [];
  loading = false;
  error = '';
  success = '';

  // טופס יצירת שק
  checkForm = {
    check_number: '',
    contact_id: '',
    amount: '',
    issue_date: '',
    due_date: '',
    is_physical: false,
    notes: '',
    deposit_immediately: false // רק לשקים נכנסים
  };

  // טופס סדרת שקים
  seriesForm = {
    contact_id: '',
    amount: '',
    day_of_month: '',
    total_checks: '',
    start_month: ''
  };

  isSeries = false;

  constructor(
    private outgoingChecksService: OutgoingChecksService,
    private incomingChecksService: IncomingChecksService,
    private contactService: ContactService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadContacts();
    this.initializeForm();
  }

  initializeForm() {
    const today = new Date().toISOString().split('T')[0];
    this.checkForm.issue_date = today;
    this.checkForm.due_date = today;
    this.seriesForm.start_month = today;
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

  onCheckTypeChange() {
    this.resetForm();
  }

  onSeriesToggle() {
    this.resetForm();
  }

  resetForm() {
    this.checkForm = {
      check_number: '',
      contact_id: '',
      amount: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      is_physical: false,
      notes: '',
      deposit_immediately: false
    };
    this.seriesForm = {
      contact_id: '',
      amount: '',
      day_of_month: '',
      total_checks: '',
      start_month: new Date().toISOString().split('T')[0]
    };
    this.error = '';
    this.success = '';
  }

  generateCheckNumber() {
    // יצירת מספר שק אוטומטי
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.checkForm.check_number = `${this.checkType === 'outgoing' ? 'OUT' : 'INC'}${timestamp}${random}`;
  }

  validateForm(): boolean {
    if (this.isSeries) {
      return this.validateSeriesForm();
    } else {
      return this.validateSingleCheckForm();
    }
  }

  validateSingleCheckForm(): boolean {
    if (!this.checkForm.check_number) {
      this.error = 'מספר שק נדרש';
      return false;
    }
    if (!this.checkForm.contact_id) {
      this.error = 'יש לבחור איש קשר';
      return false;
    }
    if (!this.checkForm.amount || parseFloat(this.checkForm.amount) <= 0) {
      this.error = 'סכום חייב להיות גדול מ-0';
      return false;
    }
    if (!this.checkForm.issue_date || !this.checkForm.due_date) {
      this.error = 'תאריכי הנפקה ופירעון נדרשים';
      return false;
    }
    if (new Date(this.checkForm.due_date) < new Date(this.checkForm.issue_date)) {
      this.error = 'תאריך הפירעון חייב להיות אחרי תאריך ההנפקה';
      return false;
    }
    return true;
  }

  validateSeriesForm(): boolean {
    if (!this.seriesForm.contact_id) {
      this.error = 'יש לבחור איש קשר';
      return false;
    }
    if (!this.seriesForm.amount || parseFloat(this.seriesForm.amount) <= 0) {
      this.error = 'סכום חייב להיות גדול מ-0';
      return false;
    }
    if (!this.seriesForm.day_of_month || parseInt(this.seriesForm.day_of_month) < 1 || parseInt(this.seriesForm.day_of_month) > 31) {
      this.error = 'יום בחודש חייב להיות בין 1-31';
      return false;
    }
    if (!this.seriesForm.total_checks || parseInt(this.seriesForm.total_checks) < 2 || parseInt(this.seriesForm.total_checks) > 24) {
      this.error = 'מספר שקים חייב להיות בין 2-24';
      return false;
    }
    if (!this.seriesForm.start_month) {
      this.error = 'חודש התחלה נדרש';
      return false;
    }
    return true;
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;

    if (this.isSeries) {
      this.createSeries();
    } else {
      this.createSingleCheck();
    }
  }

  createSingleCheck() {
    if (this.checkType === 'outgoing') {
      const checkData = {
        check_number: this.checkForm.check_number,
        payee_contact_id: parseInt(this.checkForm.contact_id),
        amount: parseFloat(this.checkForm.amount),
        issue_date: this.checkForm.issue_date,
        due_date: this.checkForm.due_date,
        is_physical: this.checkForm.is_physical,
        notes: this.checkForm.notes
      };

      this.outgoingChecksService.createCheck(checkData).subscribe({
        next: (response) => {
          this.success = 'שק יוצא נוצר בהצלחה';
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/outgoing-checks']);
          }, 2000);
        },
        error: (err) => {
          this.error = err.error?.error || 'שגיאה ביצירת השק';
          this.loading = false;
        }
      });
    } else {
      const checkData = {
        check_number: this.checkForm.check_number,
        payer_contact_id: parseInt(this.checkForm.contact_id),
        amount: parseFloat(this.checkForm.amount),
        issue_date: this.checkForm.issue_date,
        due_date: this.checkForm.due_date,
        is_physical: this.checkForm.is_physical,
        notes: this.checkForm.notes
      };

      this.incomingChecksService.createCheck(checkData).subscribe({
        next: (response) => {
          this.success = 'שק נכנס נוצר בהצלחה';
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/incoming-checks']);
          }, 2000);
        },
        error: (err) => {
          this.error = err.error?.error || 'שגיאה ביצירת השק';
          this.loading = false;
        }
      });
    }
  }

  createSeries() {
    if (this.checkType === 'outgoing') {
      const seriesData = {
        payee_contact_id: parseInt(this.seriesForm.contact_id),
        amount: parseFloat(this.seriesForm.amount),
        day_of_month: parseInt(this.seriesForm.day_of_month),
        total_checks: parseInt(this.seriesForm.total_checks),
        start_month: this.seriesForm.start_month
      };

      this.outgoingChecksService.createSeries(seriesData).subscribe({
        next: (response) => {
          this.success = `סדרת שקים יוצאים נוצרה בהצלחה - ${seriesData.total_checks} שקים`;
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/outgoing-checks']);
          }, 2000);
        },
        error: (err) => {
          this.error = err.error?.error || 'שגיאה ביצירת סדרת השקים';
          this.loading = false;
        }
      });
    } else {
      const seriesData = {
        payer_contact_id: parseInt(this.seriesForm.contact_id),
        amount: parseFloat(this.seriesForm.amount),
        day_of_month: parseInt(this.seriesForm.day_of_month),
        total_checks: parseInt(this.seriesForm.total_checks),
        start_month: this.seriesForm.start_month
      };

      this.incomingChecksService.createSeries(seriesData).subscribe({
        next: (response) => {
          this.success = `סדרת שקים נכנסים נוצרה בהצלחה - ${seriesData.total_checks} שקים`;
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/incoming-checks']);
          }, 2000);
        },
        error: (err) => {
          this.error = err.error?.error || 'שגיאה ביצירת סדרת השקים';
          this.loading = false;
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/home']);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('he-IL');
  }

  parseFloat(value: string): number {
    return parseFloat(value);
  }
}
