import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      idNumber: ['', [
        Validators.required,
        Validators.pattern(/^\d{9}$/),
        Validators.minLength(9),
        Validators.maxLength(9)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(1)
      ]],
      identifierCode: ['', [
        Validators.required,
        Validators.minLength(1)
      ]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const formData = this.loginForm.value;
      console.log('Login attempt:', formData);
      
      // כאן תוכל להוסיף לוגיקה לשליחה לשרת
      // לדוגמה: this.authService.login(formData)
      
      // סימולציה של תהליך הלוגין
      setTimeout(() => {
        this.isSubmitting = false;
        // מעבר לדשבורד לאחר כניסה מוצלחת
        this.router.navigate(['/dashboard']);
      }, 2000);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'שדה זה הוא חובה';
      }
      if (field.errors['pattern'] && fieldName === 'idNumber') {
        return 'מספר זהות חייב להכיל בדיוק 9 ספרות';
      }
      if (field.errors['minlength'] && fieldName === 'idNumber') {
        return 'מספר זהות חייב להכיל בדיוק 9 ספרות';
      }
      if (field.errors['maxlength'] && fieldName === 'idNumber') {
        return 'מספר זהות חייב להכיל בדיוק 9 ספרות';
      }
    }
    
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}
