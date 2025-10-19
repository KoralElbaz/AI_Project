import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Contact {
  id: number;
  name: string;
  type: string;
  id_number?: string;
  phone: string;
  email?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  proxy?: string;
  is_active: boolean;
  is_business: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactsResponse {
  success: boolean;
  data: Contact[];
  count: number;
}

export interface ContactResponse {
  success: boolean;
  data: Contact;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = 'http://localhost:3000/api/contacts';

  constructor(private http: HttpClient) { }

  // קבלת כל אנשי הקשר
  getAllContacts(): Observable<ContactsResponse> {
    return this.http.get<ContactsResponse>(this.apiUrl);
  }

  // קבלת איש קשר לפי ID
  getContactById(id: number): Observable<ContactResponse> {
    return this.http.get<ContactResponse>(`${this.apiUrl}/${id}`);
  }

  // יצירת איש קשר חדש
  createContact(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(this.apiUrl, contact);
  }

  // עדכון איש קשר
  updateContact(id: number, contact: Partial<Contact>): Observable<ContactResponse> {
    return this.http.put<ContactResponse>(`${this.apiUrl}/${id}`, contact);
  }

  // מחיקת איש קשר
  deleteContact(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  // חיפוש אנשי קשר
  searchContacts(term: string): Observable<ContactsResponse> {
    return this.http.get<ContactsResponse>(`${this.apiUrl}/search/${encodeURIComponent(term)}`);
  }

  // ספירת אנשי קשר
  getContactsCount(): Observable<{ success: boolean; count: number }> {
    return this.http.get<{ success: boolean; count: number }>(`${this.apiUrl}/stats/count`);
  }
}
