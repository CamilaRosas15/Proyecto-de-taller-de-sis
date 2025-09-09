import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIService } from '../../services/ai.service';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit {
  greeting: string = '';
  isLoading: boolean = false;
  error: string = '';

  constructor(private aiService: AIService) { }

  ngOnInit(): void {
    this.getAIGreeting();
  }

  getAIGreeting(): void {
    this.isLoading = true;
    this.error = '';
    
    this.aiService.getAIGreeting().subscribe({
      next: (response) => {
        this.greeting = response;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error al conectar con el servidor. Asegúrate de que el backend esté ejecutándose.';
        this.isLoading = false;
        console.error('Error:', err);
      }
    });
  }
}