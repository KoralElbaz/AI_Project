import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
    deposit_immediately: false, // רק לשקים נכנסים
    // שדות לשיקים פיזיים
    payer_name: '', // לשקים נכנסים פיזיים
    payee_name: '', // לשקים יוצאים פיזיים
    bank_name: '',
    bank_branch: ''
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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadContacts();
    this.initializeForm();
    this.handleQueryParams();
  }

  handleQueryParams() {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.checkType = params['type'] as 'outgoing' | 'incoming';
      }
      if (params['isPhysical'] === 'true') {
        this.checkForm.is_physical = true;
        this.isSeries = false; // שיקים פיזיים רק בודדים
      }
      // לשקים דיגיטליים - תמיד שיקים יוצאים
      if (!this.checkForm.is_physical) {
        this.checkType = 'outgoing';
      }
      
      // טיפול בשכפול שיק
      if (params['duplicate'] === 'true') {
        this.handleDuplicateCheck(params);
      }
    });
  }

  // טיפול בשכפול שיק
  handleDuplicateCheck(params: any) {
    // מילוי הטופס עם הנתונים מהשיק המקורי
    if (params['check_number']) {
      this.checkForm.check_number = params['check_number'];
    }
    if (params['contact_id']) {
      this.checkForm.contact_id = params['contact_id'];
    }
    if (params['amount']) {
      this.checkForm.amount = params['amount'];
    }
    if (params['notes']) {
      this.checkForm.notes = params['notes'];
    }
    if (params['bank_name']) {
      this.checkForm.bank_name = params['bank_name'];
    }
    if (params['bank_branch']) {
      this.checkForm.bank_branch = params['bank_branch'];
    }
    
    // הגדרת תאריכים חדשים
    const today = new Date();
    this.checkForm.issue_date = today.toISOString().split('T')[0];
    
    // תאריך פירעון - חודש קדימה (ברירת מחדל)
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    this.checkForm.due_date = oneMonthFromNow.toISOString().split('T')[0];
    
    // וידוא שזה שיק דיגיטלי
    this.checkForm.is_physical = false;
    this.isSeries = false;
    
    // הודעה למשתמש
    this.success = 'הטופס מולא אוטומטית עם נתוני השיק המקורי. ניתן לערוך את הפרטים לפי הצורך.';
    
    console.log('שכפול שיק - הטופס מולא עם הנתונים:', this.checkForm);
  }

  initializeForm() {
    const today = new Date().toISOString().split('T')[0];
    this.checkForm.issue_date = today;
    this.checkForm.due_date = today;
    this.seriesForm.start_month = today;
    // לשקים דיגיטליים - תמיד שיקים יוצאים
    if (!this.checkForm.is_physical) {
      this.checkType = 'outgoing';
    }
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
    // רק לשיקים פיזיים
    if (this.checkForm.is_physical) {
      this.resetForm();
    }
    // לשקים דיגיטליים - תמיד שיקים יוצאים
    if (!this.checkForm.is_physical) {
      this.checkType = 'outgoing';
    }
  }

  onSeriesToggle() {
    this.resetForm();
    // לשקים דיגיטליים - תמיד שיקים יוצאים
    if (!this.checkForm.is_physical) {
      this.checkType = 'outgoing';
    }
  }

  resetForm() {
    const isPhysical = this.checkForm.is_physical;
    this.checkForm = {
      check_number: '',
      contact_id: '',
      amount: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      is_physical: isPhysical,
      notes: '',
      deposit_immediately: false,
      payer_name: '',
      payee_name: '',
      bank_name: '',
      bank_branch: ''
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
    // יצירת מספר שק אוטומטי - רק מספרים
    const timestamp = Date.now().toString().slice(-8); // 8 ספרות אחרונות
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 ספרות עם אפסים מובילים
    this.checkForm.check_number = `${timestamp}${random}`;
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
    
    // בדיקה שמספר השק מכיל רק מספרים
    if (!/^[0-9]+$/.test(this.checkForm.check_number)) {
      this.error = 'מספר השק חייב להכיל רק ספרות';
      return false;
    }
    
    // עבור שיקים פיזיים, בדיקה של שם המשלם/המוטב
    if (this.checkForm.is_physical) {
      if (this.checkType === 'incoming' && !this.checkForm.payer_name) {
        this.error = 'שם המשלם נדרש לשק פיזי';
        return false;
      }
      if (this.checkType === 'outgoing' && !this.checkForm.payee_name) {
        this.error = 'שם המוטב נדרש לשק פיזי';
        return false;
      }
    } else {
      // עבור שיקים דיגיטליים, בדיקה של איש קשר (רק שיקים יוצאים)
      if (!this.checkForm.contact_id) {
        this.error = 'יש לבחור איש קשר';
        return false;
      }
    }
    
    if (!this.checkForm.amount || parseFloat(this.checkForm.amount) <= 0) {
      this.error = 'סכום חייב להיות גדול מ-0';
      return false;
    }
    if (!this.checkForm.due_date) {
      this.error = 'תאריך פירעון נדרש';
      return false;
    }
    if (!this.checkForm.is_physical && !this.checkForm.issue_date) {
      this.error = 'תאריך הנפקה נדרש לשקים דיגיטליים';
      return false;
    }
    if (!this.checkForm.is_physical && this.checkForm.issue_date && new Date(this.checkForm.due_date) < new Date(this.checkForm.issue_date)) {
      this.error = 'תאריך הפירעון חייב להיות אחרי תאריך ההנפקה';
      return false;
    }
    return true;
  }

  validateSeriesForm(): boolean {
    // רק שיקים יוצאים לשקים דיגיטליים
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
      if (this.checkForm.is_physical) {
        // יצירת שק פיזי יוצא
        const checkData = {
          check_number: this.checkForm.check_number,
          payee_name: this.checkForm.payee_name,
          amount: parseFloat(this.checkForm.amount),
          due_date: this.checkForm.due_date,
          bank_name: this.checkForm.bank_name,
          bank_branch: this.checkForm.bank_branch,
          notes: this.checkForm.notes
        };

        this.outgoingChecksService.createPhysicalCheck(checkData).subscribe({
          next: (response) => {
            this.success = 'שק פיזי יוצא נוצר בהצלחה';
            this.loading = false;
            setTimeout(() => {
              this.router.navigate(['/outgoing-checks']);
            }, 2000);
          },
          error: (err) => {
            this.error = err.error?.error || 'שגיאה ביצירת השק הפיזי';
            this.loading = false;
          }
        });
      } else {
        // יצירת שק דיגיטלי יוצא
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
      }
    } else {
      if (this.checkForm.is_physical) {
        // יצירת שק פיזי נכנס
        const checkData = {
          check_number: this.checkForm.check_number,
          payer_name: this.checkForm.payer_name,
          amount: parseFloat(this.checkForm.amount),
          due_date: this.checkForm.due_date,
          bank_name: this.checkForm.bank_name,
          bank_branch: this.checkForm.bank_branch,
          notes: this.checkForm.notes
        };

        this.incomingChecksService.createPhysicalCheck(checkData).subscribe({
          next: (response) => {
            this.success = 'שק פיזי נכנס נוצר בהצלחה';
            this.loading = false;
            setTimeout(() => {
              this.router.navigate(['/incoming-checks']);
            }, 2000);
          },
          error: (err) => {
            this.error = err.error?.error || 'שגיאה ביצירת השק הפיזי';
            this.loading = false;
          }
        });
      }
    }
  }

  createSeries() {
    // רק שיקים יוצאים לשקים דיגיטליים
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
  }

  cancel() {
    this.router.navigate(['/dashboard']);
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
