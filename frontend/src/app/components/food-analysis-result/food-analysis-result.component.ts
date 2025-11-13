import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoodDashboardData } from '../../core/adapters/vision-dashboard.adapter';

@Component({
  selector: 'app-food-analysis-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './food-analysis-result.component.html',
  styleUrls: ['./food-analysis-result.component.scss']
})
export class FoodAnalysisResultComponent {
  @Input() data: FoodDashboardData | null = null;
  @Input() imageUrl: string | null | undefined;

  // Valores de referencia diarios (ejemplo)
  private calorieTarget = 2000;
  private carbsTarget = 250;
  private proteinTarget = 124;
  private fatTarget = 55;

  private clampPct(v: number): number {
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  get totalCalories(): number {
    return Math.round(this.data?.aggregates?.calories || 0);
  }

  get caloriesPct(): number {
    return this.clampPct((this.totalCalories / this.calorieTarget) * 100);
  }

  get carbsDailyPct(): number {
    const v = this.data?.aggregates?.carbsGrams || 0;
    return this.clampPct((v / this.carbsTarget) * 100);
  }

  get proteinDailyPct(): number {
    const v = this.data?.aggregates?.proteinGrams || 0;
    return this.clampPct((v / this.proteinTarget) * 100);
  }

  get fatDailyPct(): number {
    const v = this.data?.aggregates?.fatGrams || 0;
    return this.clampPct((v / this.fatTarget) * 100);
  }
}
