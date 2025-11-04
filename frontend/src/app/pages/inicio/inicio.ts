import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIService } from '../../services/ai.service';
import { adaptFriendlyTextToFoodDashboard, FoodDashboardData } from '../../core/adapters/vision-dashboard.adapter';
import { FoodDashboardComponent } from '../../components/food-dashboard/food-dashboard.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FoodDashboardComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit {
  greeting: string = '';
  isLoading: boolean = false;
  error: string = '';
  dashboardData: FoodDashboardData | null = null;
  showRaw: boolean = false;

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
        this.dashboardData = adaptFriendlyTextToFoodDashboard(response);
        console.log('Dashboard data', this.dashboardData);
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