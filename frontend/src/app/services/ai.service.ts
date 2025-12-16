import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private apiUrl = 'https://proyecto-de-taller-de-sis-6xbp.onrender.com'; 

  constructor(private http: HttpClient) { }

  getAIGreeting(): Observable<string> {
    return this.http.get(`${this.apiUrl}/nutrichef-ai`, { responseType: 'text' });
  }
}