import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HelloResponse, API_ENDPOINTS } from '../models/api.models';
import { API_CONFIG } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = API_CONFIG.BASE_URL;

  private readonly http = inject(HttpClient);

  /**
   * קבלת הודעת שלום מהשרת
   */
  async getHello(): Promise<HelloResponse> {
    const url = `${this.baseUrl}${API_ENDPOINTS.hello}`;
    try {
      return await firstValueFrom(this.http.get<HelloResponse>(url));
    } catch (error) {
      throw this.handleError(error as HttpErrorResponse);
    }
  }

  /**
   * טיפול בשגיאות HTTP
   */
  private handleError(error: HttpErrorResponse): Error {
    let errorMessage = 'שגיאה לא ידועה';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `שגיאה: ${error.error.message}`;
    } else {
      errorMessage = `שגיאת שרת: ${error.status} - ${error.message}`;
    }
    console.error('API Error:', errorMessage);
    return new Error(errorMessage);
  }
}
