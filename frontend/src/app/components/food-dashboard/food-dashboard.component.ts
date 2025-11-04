import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoodDashboardData } from '../../core/adapters/vision-dashboard.adapter';

@Component({
  selector: 'app-food-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fd-dashboard" *ngIf="data">
      <div class="fd-header">
        <div class="fd-title">Resumen nutricional</div>
        <div class="fd-badges">
          <span *ngIf="data.summary.mealType" class="fd-badge">{{ data.summary.mealType }}</span>
        </div>
      </div>

      <div class="fd-summary" *ngIf="data.summary.quickSummary || data.summary.healthScore !== undefined">
        <div class="msg" *ngIf="data.summary.quickSummary">
          <span class="badge">i</span>
          {{ data.summary.quickSummary }}
        </div>
        <div class="score" *ngIf="data.summary.healthScore !== undefined">Salud: {{ data.summary.healthScore }}/10</div>
      </div>

      <div class="fd-kpis" *ngIf="data.kpis?.length">
        <div class="fd-kpi" *ngFor="let k of data.kpis">
          <div class="label">{{ k.label }}</div>
          <div class="value">{{ k.value }}</div>
        </div>
      </div>

      <div class="fd-grid">
        <div class="fd-card fd-charts" *ngIf="data.aggregates">
          <div class="fd-card-title">Distribución de macronutrientes</div>
          <div class="chart-row">
            <div class="donut" *ngIf="macroTotalGrams > 0">
              <svg viewBox="0 0 36 36" class="donut-svg">
                <circle class="bg" cx="18" cy="18" r="15.915" />
                <circle class="seg protein" cx="18" cy="18" r="15.915"
                        [attr.stroke-dasharray]="proteinPct + ' ' + (100 - proteinPct)"
                        stroke-dashoffset="25"></circle>
                <circle class="seg carbs" cx="18" cy="18" r="15.915"
                        [attr.stroke-dasharray]="carbsPct + ' ' + (100 - carbsPct)"
                        [attr.stroke-dashoffset]="25 + proteinPct"></circle>
                <circle class="seg fat" cx="18" cy="18" r="15.915"
                        [attr.stroke-dasharray]="fatPct + ' ' + (100 - fatPct)"
                        [attr.stroke-dashoffset]="25 + proteinPct + carbsPct"></circle>
                <text x="18" y="20" text-anchor="middle" class="donut-center">{{ macroTotalGrams }} g</text>
              </svg>
              <div class="legend">
                <span class="dot protein"></span> Proteína {{ data.aggregates.proteinGrams || 0 }}g
                <span class="dot carbs"></span> Carbohidratos {{ data.aggregates.carbsGrams || 0 }}g
                <span class="dot fat"></span> Grasa {{ data.aggregates.fatGrams || 0 }}g
              </div>
            </div>
            <div class="bars" *ngIf="macroTotalGrams > 0">
              <div class="bar-row">
                <div class="bar-label">Proteína</div>
                <div class="bar-track"><div class="bar protein" [style.width.%]="proteinPct"></div></div>
                <div class="bar-val">{{ data.aggregates.proteinGrams }} g</div>
              </div>
              <div class="bar-row">
                <div class="bar-label">Carbohidratos</div>
                <div class="bar-track"><div class="bar carbs" [style.width.%]="carbsPct"></div></div>
                <div class="bar-val">{{ data.aggregates.carbsGrams }} g</div>
              </div>
              <div class="bar-row">
                <div class="bar-label">Grasa</div>
                <div class="bar-track"><div class="bar fat" [style.width.%]="fatPct"></div></div>
                <div class="bar-val">{{ data.aggregates.fatGrams }} g</div>
              </div>
            </div>
          </div>
        </div>
        <div class="fd-right">
          <div class="fd-card compact">
            <div class="fd-card-title">Alimentos detectados</div>
            <div class="fd-items">
              <div class="fd-item" *ngFor="let it of data.items">
                <div class="name">{{ it.name }}</div>
                <div class="meta">
                  <span *ngIf="it.confidenceText">{{ it.confidenceText }}</span>
                  <span *ngIf="it.portionText">· {{ it.portionText }}</span>
                  <span *ngIf="it.estimatedGrams">· ~{{ it.estimatedGrams }} g</span>
                  <ng-container *ngIf="it.extra?.length">
                    <span *ngFor="let e of it.extra">· {{ e }}</span>
                  </ng-container>
                </div>
              </div>
              <div *ngIf="!data.items?.length" class="fd-empty">Sin detecciones</div>
            </div>
          </div>

          <div class="fd-card compact">
            <div class="fd-card-title">Información nutricional</div>
            <div class="fd-list">
              <div class="fd-row" *ngFor="let n of data.nutrition">
                <div class="l">{{ n.label }}</div>
                <div class="r">{{ n.value }}</div>
              </div>
              <div *ngIf="!data.nutrition?.length" class="fd-empty">Sin datos</div>
            </div>
          </div>

          <div class="fd-card compact">
            <div class="fd-card-title">Recomendaciones</div>
            <ul class="fd-reco">
              <li *ngFor="let r of data.recommendations">{{ r }}</li>
            </ul>
            <div *ngIf="!data.recommendations?.length" class="fd-empty">Sin recomendaciones</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fd-dashboard { display: grid; gap: 16px; width: 100%; margin: 0; }
    .fd-header { display: flex; align-items: center; justify-content: space-between; }
    .fd-title { font-size: 1.25rem; font-weight: 600; color: #0f172a; }
    .fd-badges { display: flex; gap: 8px; }
    .fd-badge { background: #eef2ff; color: #3730a3; padding: 4px 8px; border-radius: 999px; font-size: 12px; }
    .fd-badge.score { background: #ecfdf5; color: #065f46; }
    .fd-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%); border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 14px; box-shadow: 0 1px 2px rgba(2,6,23,0.04); }
    .fd-summary .msg { color: #0f172a; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .fd-summary .msg .badge { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; background: #3b82f6; color: white; font-weight: 700; font-size: 12px; }
    .fd-summary .score { background: #ecfdf5; color: #065f46; padding: 4px 8px; border-radius: 999px; font-weight: 600; font-size: 12px; }
    .fd-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .fd-kpi { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; min-height: 72px; box-shadow: 0 1px 2px rgba(2,6,23,0.04); }
    .fd-kpi .label { color: #6b7280; font-size: 12px; }
    .fd-kpi .value { font-size: 20px; font-weight: 600; color: #0f172a; }
    .fd-grid { display: grid; grid-template-columns: minmax(520px, 2fr) minmax(360px, 1.2fr); gap: 20px; align-items: start; width: 100%; }
    .fd-right { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-content: start; }
    .fd-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; box-shadow: 0 1px 2px rgba(2,6,23,0.04); }
    .fd-card.compact { max-height: clamp(260px, 40vh, 420px); overflow: auto; }
    .fd-card.compact::-webkit-scrollbar { width: 8px; }
    .fd-card.compact::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 999px; }
    .fd-card-title { font-weight: 600; margin-bottom: 10px; color: #111827; }
    .fd-items { display: grid; gap: 8px; }
    .fd-item { padding: 6px 0; border-bottom: 1px dashed #eef2f7; }
    .fd-item:last-child { border-bottom: 0; }
    .fd-item .name { font-weight: 600; color: #111827; font-size: 14px; }
    .fd-item .meta { color: #6b7280; font-size: 12px; }
    .fd-list { display: grid; gap: 6px; }
    .fd-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; line-height: 1.2; }
    .fd-row .l { color: #475569; }
    .fd-row .r { color: #0f172a; text-align: right; }
    .fd-reco { margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.25; }
    .fd-empty { color: #9ca3af; font-style: italic; }
    /* Charts */
    .fd-charts .chart-row { display: grid; grid-template-columns: minmax(220px, 28vw) 1fr; gap: clamp(16px, 2vw, 28px); align-items: center; }
    .donut-svg { width: clamp(140px, 18vw, 220px); height: clamp(140px, 18vw, 220px); }
    .donut-svg .bg { fill: none; stroke: #f1f5f9; stroke-width: 3; }
    .donut-svg .seg { fill: none; stroke-width: 3; }
    .donut-svg .protein { stroke: #60a5fa; }
    .donut-svg .carbs { stroke: #34d399; }
    .donut-svg .fat { stroke: #f59e0b; }
    .donut-center { font-size: 4.2px; fill: #111827; font-weight: 700; }
    .legend { display: grid; gap: 6px; margin-top: 10px; font-size: 12px; color: #374151; }
    .legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 6px; }
    .legend .dot.protein { background: #60a5fa; }
    .legend .dot.carbs { background: #34d399; }
    .legend .dot.fat { background: #f59e0b; }
    .bars { display: grid; gap: 10px; }
    .bar-row { display: grid; grid-template-columns: 110px 1fr 70px; align-items: center; gap: 10px; }
    .bar-track { background: #f1f5f9; height: 10px; border-radius: 999px; overflow: hidden; }
    .bar { height: 100%; border-radius: 999px; }
    .bar.protein { background: #60a5fa; }
    .bar.carbs { background: #34d399; }
    .bar.fat { background: #f59e0b; }
    @media (max-width: 1200px) { .fd-kpis { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); } }
    @media (min-width: 1280px) { .fd-right { grid-template-columns: repeat(2, minmax(280px, 1fr)); } }
    @media (min-width: 1600px) { .fd-right { grid-template-columns: repeat(3, minmax(280px, 1fr)); } }
    @media (max-width: 960px) { 
      .fd-grid { grid-template-columns: 1fr; }
      .fd-right { grid-template-columns: 1fr; }
      .fd-kpis { grid-template-columns: repeat(2, 1fr); } 
      .fd-charts .chart-row { grid-template-columns: 1fr; }
    }
  `]
})
export class FoodDashboardComponent {
  @Input() data!: FoodDashboardData | null;
  get macroTotalGrams(): number {
    const a = this.data?.aggregates;
    const p = a?.proteinGrams || 0; const c = a?.carbsGrams || 0; const f = a?.fatGrams || 0;
    return Math.round(p + c + f);
  }
  get proteinPct(): number { const t = this.macroTotalGrams || 0; return t ? Math.round(((this.data?.aggregates?.proteinGrams || 0) / t) * 100) : 0; }
  get carbsPct(): number { const t = this.macroTotalGrams || 0; return t ? Math.round(((this.data?.aggregates?.carbsGrams || 0) / t) * 100) : 0; }
  get fatPct(): number { const t = this.macroTotalGrams || 0; return t ? Math.round(((this.data?.aggregates?.fatGrams || 0) / t) * 100) : 0; }
}


