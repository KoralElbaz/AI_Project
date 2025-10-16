import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContactService, Contact } from '../../services/contact.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  contacts: Contact[] = [];
  isLoading = false;
  error: string | null = null;
  showContacts = false;

  constructor(
    private router: Router,
    private contactService: ContactService
  ) {}

  // טעינת אנשי הקשר
  loadContacts(): void {
    this.isLoading = true;
    this.error = null;
    
    this.contactService.getAllContacts().subscribe({
      next: (response) => {
        if (response.success) {
          this.contacts = response.data;
          this.showContacts = true;
          console.log('Contacts loaded:', this.contacts);
        } else {
          this.error = 'שגיאה בטעינת אנשי הקשר';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading contacts:', err);
        this.error = 'שגיאה בחיבור לשרת';
        this.isLoading = false;
      }
    });
  }

  // הסתרת רשימת אנשי הקשר
  hideContacts(): void {
    this.showContacts = false;
    this.contacts = [];
    this.error = null;
  }

  logout(): void {
    // כאן תוכל להוסיף לוגיקה לניקוי session או token
    console.log('Logging out...');
    
    // מעבר חזרה לדף הכניסה
    this.router.navigate(['/login']);
  }
}
