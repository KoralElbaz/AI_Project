import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OutgoingChecksService, CreateOutgoingCheckRequest, CreateOutgoingSeriesRequest } from '../../services/outgoing-checks';
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
    // שדות חדשים
    payee_name: '',
    id_number: '',
    identifier_type: 'phone',
    phone: '',
    bank_branch: '',
    account_number: '',
    is_business: false
  };

  todayDate = new Date().toISOString().split('T')[0];

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
      // תמיד שיקים יוצאים לשקים דיגיטליים
      this.checkType = 'outgoing';
    });
  }

  initializeForm() {
    const today = new Date().toISOString().split('T')[0];
    this.checkForm.issue_date = today;
    this.checkForm.due_date = today;
    this.seriesForm.start_month = today;
    // תמיד שיקים יוצאים לשקים דיגיטליים
    this.checkType = 'outgoing';
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
    // תמיד שיקים יוצאים לשקים דיגיטליים
    this.checkType = 'outgoing';
    this.resetForm();
  }

  onSeriesToggle() {
    this.resetForm();
    // תמיד שיקים יוצאים לשקים דיגיטליים
    this.checkType = 'outgoing';
  }

  // פונקציות לטיפול בשדות
  onCheckNumberInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    this.checkForm.check_number = numbersOnly;
  }

  onPayeeNameInput(event: any) {
    const value = event.target.value;
    // רק עברית, אנגלית, רווח ו-
    const validChars = value.replace(/[^א-תa-zA-Z\s\-]/g, '');
    this.checkForm.payee_name = validChars;
  }

  onIdNumberInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    this.checkForm.id_number = numbersOnly;
  }

  onPhoneInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    
    // פורמט אוטומטי
    let formatted = numbersOnly;
    if (numbersOnly.length > 3) {
      formatted = numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3);
    }
    
    this.checkForm.phone = formatted;
  }

  onBankBranchInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    this.checkForm.bank_branch = numbersOnly;
  }

  onAccountNumberInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    this.checkForm.account_number = numbersOnly;
  }

  onAmountInput(event: any) {
    const value = event.target.value;
    // רק מספרים ונקודה
    const validChars = value.replace(/[^0-9.]/g, '');
    
    // פורמט עם פסיקים
    const parts = validChars.split('.');
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    this.checkForm.amount = parts.join('.');
  }

  onIdentifierTypeChange() {
    // איפוס השדות כשמשנים סוג זיהוי
    this.checkForm.phone = '';
    this.checkForm.bank_branch = '';
    this.checkForm.account_number = '';
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
      deposit_immediately: false,
      // שדות חדשים
      payee_name: '',
      id_number: '',
      identifier_type: 'phone',
      phone: '',
      bank_branch: '',
      account_number: '',
      is_business: false
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
    // יצירת מספר שק אוטומטי שלא קיים ב-DB - רק מספרים
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const checkNumber = `${timestamp}${random}`;
    
    // בדיקה שהמספר לא קיים ב-DB
    this.checkIfCheckNumberExists(checkNumber);
  }

  checkIfCheckNumberExists(checkNumber: string) {
    // בדיקה אם המספר קיים ב-DB לשיקים יוצאים
    this.outgoingChecksService.getAllChecks().subscribe({
      next: (response: any) => {
        const existingCheck = response.data?.find((check: any) => check.check_number === checkNumber);
        if (existingCheck) {
          // אם המספר קיים, ננסה מספר אחר
          this.generateCheckNumber();
        } else {
          this.checkForm.check_number = checkNumber;
        }
      },
      error: (err: any) => {
        console.error('Error checking check number:', err);
        // במקרה של שגיאה, נשתמש במספר שנוצר
        this.checkForm.check_number = checkNumber;
      }
    });
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
    
    // בדיקת שם המוטב
    if (!this.checkForm.payee_name) {
      this.error = 'שם המוטב נדרש';
      return false;
    }
    
    // בדיקת ת.ז/ח.פ
    if (!this.checkForm.id_number) {
      this.error = this.checkForm.is_business ? 'מספר ח.פ נדרש' : 'מספר ת.ז נדרש';
      return false;
    }
    
    // בדיקת סוג זיהוי
    if (this.checkForm.identifier_type === 'phone') {
      if (!this.checkForm.phone) {
        this.error = 'מספר נייד נדרש';
        return false;
      }
    } else if (this.checkForm.identifier_type === 'account') {
      if (!this.checkForm.bank_branch) {
        this.error = 'מספר סניף נדרש';
        return false;
      }
      if (!this.checkForm.account_number) {
        this.error = 'מספר חשבון נדרש';
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
    if (!this.checkForm.payee_name) {
      this.error = 'שם המוטב נדרש';
      return false;
    }
    if (!this.checkForm.id_number) {
      this.error = this.checkForm.is_business ? 'מספר ח.פ נדרש' : 'מספר ת.ז נדרש';
      return false;
    }
    if (this.checkForm.identifier_type === 'phone') {
      if (!this.checkForm.phone) {
        this.error = 'מספר נייד נדרש';
        return false;
      }
    } else if (this.checkForm.identifier_type === 'account') {
      if (!this.checkForm.bank_branch) {
        this.error = 'מספר סניף נדרש';
        return false;
      }
      if (!this.checkForm.account_number) {
        this.error = 'מספר חשבון נדרש';
        return false;
      }
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
    // רק שיקים דיגיטליים יוצאים
    const checkData: CreateOutgoingCheckRequest = {
      check_number: this.checkForm.check_number,
      payee_name: this.checkForm.payee_name,
      id_number: this.checkForm.id_number,
      identifier_type: this.checkForm.identifier_type,
      phone: this.checkForm.phone,
      bank_branch: this.checkForm.bank_branch,
      account_number: this.checkForm.account_number,
      amount: parseFloat(this.checkForm.amount.replace(/,/g, '')),
      issue_date: this.checkForm.issue_date,
      due_date: this.checkForm.due_date,
      is_physical: false,
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

  createSeries() {
    // רק שיקים יוצאים לשקים דיגיטליים
    const seriesData: CreateOutgoingSeriesRequest = {
      payee_name: this.checkForm.payee_name,
      id_number: this.checkForm.id_number,
      identifier_type: this.checkForm.identifier_type,
      phone: this.checkForm.phone,
      bank_branch: this.checkForm.bank_branch,
      account_number: this.checkForm.account_number,
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
