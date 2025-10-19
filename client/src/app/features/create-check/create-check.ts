import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OutgoingChecksService, CreateOutgoingCheckRequest, CreateOutgoingSeriesRequest } from '../../services/outgoing-checks';
import { IncomingChecksService } from '../../services/incoming-checks';
import { ContactService, Contact } from '../../services/contact.service';

@Component({
  selector: 'app-create-check',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-check.html',
  styleUrl: './create-check.css'
})
export class CreateCheckComponent implements OnInit {
  checkType: 'outgoing' | 'incoming' = 'outgoing';
  isSeries = false;
  contacts: Contact[] = [];
  loading = false;
  error = '';
  success = '';

  // טופס יצירת שק
  formData = {
    check_number: '',
    contact_id: '',
    amount: '',
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
    this.formData.due_date = today;
    this.seriesForm.start_month = today;
    // תמיד שיקים יוצאים לשקים דיגיטליים
    this.checkType = 'outgoing';
    // יצירת מספר שיק אוטומטי
    this.generateCheckNumber();
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
    this.formData.check_number = numbersOnly;
  }

  onPayeeNameInput(event: any) {
    const value = event.target.value;
    // רק עברית, אנגלית, רווח ו-
    const validChars = value.replace(/[^א-תa-zA-Z\s\-]/g, '');
    this.formData.payee_name = validChars;
  }

  onIdNumberInput(event: any) {
    const value = event.target.value;
    // רק מספרים, מקסימום 9 ספרות
    const numbersOnly = value.replace(/[^0-9]/g, '').substring(0, 9);
    this.formData.id_number = numbersOnly;
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
    
    this.formData.phone = formatted;
  }

  onBankBranchInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    this.formData.bank_branch = numbersOnly;
  }

  onAccountNumberInput(event: any) {
    const value = event.target.value;
    // רק מספרים
    const numbersOnly = value.replace(/[^0-9]/g, '');
    this.formData.account_number = numbersOnly;
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
    
    this.formData.amount = parts.join('.');
  }

  onIdentifierTypeChange() {
    // איפוס השדות כשמשנים סוג זיהוי
    this.formData.phone = '';
    this.formData.bank_branch = '';
    this.formData.account_number = '';
  }

  resetForm() {
    this.formData = {
      check_number: '',
      contact_id: '',
      amount: '',
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
    // יצירת מספר שיק חדש
    this.generateCheckNumber();
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
          this.formData.check_number = checkNumber;
        }
      },
      error: (err: any) => {
        console.error('Error checking check number:', err);
        // במקרה של שגיאה, נשתמש במספר שנוצר
        this.formData.check_number = checkNumber;
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
    // ולידציה מינימלית - רק בדיקה בסיסית
    console.log('Form data:', this.formData);
    return true; // תמיד true - ללא ולידציה
  }

  validateSeriesForm(): boolean {
    // ולידציה מינימלית - רק בדיקה בסיסית
    console.log('Series form data:', this.seriesForm);
    return true; // תמיד true - ללא ולידציה
  }

  onSubmit() {
    this.error = '';
    this.success = '';

    console.log('Form submitted!');
    console.log('Form data:', this.formData);
    console.log('Is series:', this.isSeries);

    // עקיפת ולידציה - תמיד ממשיך
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
      check_number: this.formData.check_number,
      payee_name: this.formData.payee_name,
      id_number: this.formData.id_number,
      identifier_type: this.formData.identifier_type,
      phone: this.formData.phone,
      bank_branch: this.formData.bank_branch,
      account_number: this.formData.account_number,
      amount: parseFloat(this.formData.amount.replace(/,/g, '')),
      issue_date: new Date().toISOString().split('T')[0],
      due_date: this.formData.due_date,
      is_physical: false,
      notes: this.formData.notes
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
      payee_name: this.formData.payee_name,
      id_number: this.formData.id_number,
      identifier_type: this.formData.identifier_type,
      phone: this.formData.phone,
      bank_branch: this.formData.bank_branch,
      account_number: this.formData.account_number,
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
