import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoodDashboardData } from '../../core/adapters/vision-dashboard.adapter';
import { AiTextToHtmlPipe } from '../../pipes/ai-text-to-html.pipe';

@Component({
  selector: 'app-food-dashboard',
  standalone: true,
  imports: [CommonModule, AiTextToHtmlPipe],
  template: `
    <div class="nutrition-dashboard">
      <!-- Imagen de comida -->
      <div class="food-image-container">
        <img [src]="imageUrl" alt="Plato analizado" class="food-main-image">
      </div>

      <!-- Lista de alimentos detectados -->
      <div class="food-items-list">
        <div class="food-item-card" *ngFor="let item of data?.items || []">
          <h3 class="food-title">{{ item.name }} <span class="weight" *ngIf="item.estimatedGrams">({{ item.estimatedGrams }} g)</span></h3>
          
          <div class="nutrition-info">
            <span class="nutrition-badge calories" *ngIf="item.calories">Calories: {{ item.calories }}</span>
            <span class="nutrition-badge carbs" *ngIf="item.carbsGrams">Carbs: {{ item.carbsGrams }}g</span>
            <span class="nutrition-badge protein" *ngIf="item.proteinGrams">Protein: {{ item.proteinGrams }}g</span>
            <span class="nutrition-badge fat" *ngIf="item.fatGrams">Fat: {{ item.fatGrams }}g</span>
          </div>
        </div>
      </div>

      <!-- Resumen nutricional total -->
      <div class="nutrition-summary" *ngIf="data?.aggregates">
        <div class="summary-item">
          <div class="summary-label">Calorías</div>
          <div class="summary-value">{{ totalCalories }}</div>
          <div class="progress-bar">
            <div class="progress-fill calories-fill" [style.width.%]="caloriesPct"></div>
          </div>
          <div class="summary-percentage">{{ caloriesPct }}%</div>
        </div>
        
        <div class="summary-item">
          <div class="summary-label">Carbos</div>
          <div class="summary-value">{{ data?.aggregates?.carbsGrams || 0 }}g</div>
          <div class="progress-bar">
            <div class="progress-fill carbs-fill" [style.width.%]="carbsDailyPct"></div>
          </div>
          <div class="summary-percentage">{{ carbsDailyPct }}%</div>
        </div>
        
        <div class="summary-item">
          <div class="summary-label">Proteína</div>
          <div class="summary-value">{{ data?.aggregates?.proteinGrams || 0 }}g</div>
          <div class="progress-bar">
            <div class="progress-fill protein-fill" [style.width.%]="proteinDailyPct"></div>
          </div>
          <div class="summary-percentage">{{ proteinDailyPct }}%</div>
        </div>
        
        <div class="summary-item">
          <div class="summary-label">Grasa</div>
          <div class="summary-value">{{ data?.aggregates?.fatGrams || 0 }}g</div>
          <div class="progress-bar">
            <div class="progress-fill fat-fill" [style.width.%]="fatDailyPct"></div>
          </div>
          <div class="summary-percentage">{{ fatDailyPct }}%</div>
        </div>
      </div>

      <!-- Botón Ver Detalles -->
      <div class="details-button-container" *ngIf="rawAnalysis">
        <button class="details-btn" (click)="openModal()">
          📋 Ver análisis completo
        </button>
      </div>
    </div>

    <!-- Modal para mostrar análisis completo -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🍽️ Análisis Nutricional Completo</h2>
          <button class="modal-close" (click)="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="full-analysis" *ngIf="rawAnalysis">
            <div [innerHTML]="rawAnalysis | aiTextToHtml"></div>
          </div>
          <div class="no-analysis" *ngIf="!rawAnalysis">
            <p>No hay análisis disponible.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-close-btn" (click)="closeModal()">Cerrar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nutrition-dashboard {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-radius: 20px;
      padding: 24px;
      color: #333;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
      border: 1px solid #e9ecef;
    }

    .nutrition-dashboard::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
      pointer-events: none;
    }

    .food-image-container {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    .food-main-image {
      width: 200px;
      height: 200px;
      border-radius: 16px;
      object-fit: cover;
      border: 4px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .food-items-list {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    .food-item-card {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .food-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .weight {
      font-size: 14px;
      color: #7f8c8d;
      font-weight: 400;
    }

    .nutrition-info {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nutrition-badge {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      color: #495057;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
    }

    .nutrition-badge.calories {
      background: #fff3cd;
      border-color: #ffeaa7;
      color: #856404;
    }

    .nutrition-badge.carbs {
      background: #d1ecf1;
      border-color: #74c0fc;
      color: #0c5460;
    }

    .nutrition-badge.protein {
      background: #d4edda;
      border-color: #51cf66;
      color: #155724;
    }

    .nutrition-badge.fat {
      background: #f8d7da;
      border-color: #ff8787;
      color: #721c24;
    }

    .nutrition-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #495057;
      text-shadow: none;
    }

    .summary-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #2c3e50;
      text-shadow: none;
    }

    .progress-bar {
      width: 100%;
      height: 10px;
      background: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
      border: 1px solid #dee2e6;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.6s ease;
      border-radius: 4px;
    }

    .calories-fill {
      background: linear-gradient(90deg, #FF6B6B, #FF8787);
    }

    .carbs-fill {
      background: linear-gradient(90deg, #4ECDC4, #44A08D);
    }

    .protein-fill {
      background: linear-gradient(90deg, #45B7D1, #96C93D);
    }

    .fat-fill {
      background: linear-gradient(90deg, #F7DC6F, #F39C12);
    }

    .summary-percentage {
      font-size: 14px;
      font-weight: 600;
      color: #6c757d;
      text-shadow: none;
    }

    .details-button-container {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }

    .details-btn {
      background: rgba(255, 255, 255, 0.9);
      color: #667eea;
      border: 2px solid rgba(255, 255, 255, 0.5);
      padding: 14px 28px;
      border-radius: 30px;
      cursor: pointer;
      font-weight: 700;
      font-size: 15px;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .details-btn:hover {
      background: #ffffff;
      color: #5a67d8;
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      border-color: #ffffff;
    }

    /* Modal styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #667eea;
      color: white;
      border-radius: 16px 16px 0 0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 28px;
      color: white;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s ease;
    }

    .modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }

    .modal-close-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s ease;
    }

    .modal-close-btn:hover {
      background: #5a67d8;
    }

    /* Full analysis styles */
    .full-analysis {
      color: #2d3748;
      line-height: 1.6;
      font-size: 15px;
    }

    /* Línea de introducción */
    .full-analysis .intro-line {
      font-size: 18px;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 32px;
      text-align: center;
      padding: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    /* Headers de secciones */
    .full-analysis .section-header {
      font-size: 20px;
      color: #2c3e50;
      font-weight: 700;
      margin: 32px 0 20px 0;
      padding-bottom: 12px;
      border-bottom: 3px solid #667eea;
      display: flex;
      align-items: center;
    }

    .full-analysis .section-emoji {
      font-size: 24px;
      margin-right: 12px;
    }

    /* Items de comida (alimentos detectados e información nutricional) */
    .full-analysis .food-item {
      margin: 16px 0;
      padding: 16px 20px;
      background: #f8f9fa;
      border-left: 4px solid #28a745;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    /* Análisis y recomendaciones */
    .full-analysis .analysis-item {
      margin: 16px 0;
      padding: 16px 20px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    /* Resumen rápido */
    .full-analysis .summary-item {
      margin: 24px 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .no-analysis {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .nutrition-dashboard {
        padding: 20px;
        margin: 0 16px;
      }

      .food-main-image {
        width: 180px;
        height: 180px;
      }

      .modal-content {
        max-width: 95vw;
        max-height: 95vh;
        width: 100%;
      }

      .modal-header {
        padding: 16px 20px;
      }

      .modal-header h2 {
        font-size: 18px;
      }

      .modal-body {
        padding: 20px;
        max-height: calc(95vh - 120px);
      }
    }

    @media (max-width: 480px) {
      .nutrition-summary {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .nutrition-dashboard {
        padding: 16px;
        margin: 0 8px;
      }

      .food-item-card {
        padding: 16px;
      }

      .summary-value {
        font-size: 22px;
      }

      .modal-content {
        max-width: 98vw;
        max-height: 98vh;
      }

      .modal-header {
        padding: 12px 16px;
      }

      .modal-header h2 {
        font-size: 16px;
      }

      .modal-body {
        padding: 16px;
        max-height: calc(98vh - 100px);
        font-size: 14px;
      }
    }
  `]
})
export class FoodDashboardComponent {
  @Input() data!: FoodDashboardData | null;
  @Input() imageUrl: string | null | undefined;
  @Input() rawAnalysis: string | null = null; // Análisis narrativo para el modal
  @Input() calorieTarget = 2000;
  @Input() carbsTarget = 250;
  @Input() proteinTarget = 124;
  @Input() fatTarget = 55;

  showModal = false;

  constructor() {}

  get totalCalories(): number { 
    return Math.round(this.data?.aggregates?.calories || 0); 
  }
  
  private clampPct(v: number) { 
    return Math.max(0, Math.min(100, Math.round(v))); 
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

  openModal(): void {
    console.log('🔍 MODAL ABIERTO - rawAnalysis recibido:', this.rawAnalysis ? this.rawAnalysis.substring(0, 300) + '...' : 'NULL/UNDEFINED');
    this.showModal = true;
  }

  closeModal(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showModal = false;
  }
}