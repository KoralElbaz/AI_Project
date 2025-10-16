import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
  protected serverMessage = signal<string>('');
  protected isLoading = signal<boolean>(false);

  private readonly apiService = inject(ApiService);

  // פונקציה לקריאה מהשרת
  async fetchData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await this.apiService.getHello();
      this.serverMessage.set(response.message);
    } catch (error) {
      console.error('Error fetching data:', error);
      this.serverMessage.set('שגיאה בחיבור לשרת');
    } finally {
      this.isLoading.set(false);
    }
  }
}
