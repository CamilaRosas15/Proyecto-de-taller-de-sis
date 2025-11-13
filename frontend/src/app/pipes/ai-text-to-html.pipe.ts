import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'aiTextToHtml',
  standalone: true
})
export class AiTextToHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value?: string | null): SafeHtml {
    if (!value) return '';

    // Escape HTML special chars first to avoid injection
    let escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Convert bold markers **text** -> <strong>text</strong>
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, (_m, p1) => `<strong>${p1}</strong>`);

    // Split into lines and process
    const lines = escaped.split(/\r?\n/);
    const out: string[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      
      // Skip completely empty lines but preserve structure
      if (!raw) {
        out.push('<div class="spacer"></div>');
        continue;
      }

      // Detect main intro line (first substantive line with emojis or excitement)
      if (i === 0 || (i < 3 && raw.match(/¡.*😋|¡.*!.*😋/))) {
        out.push(`<div class="intro-line">${raw}</div>`);
        continue;
      }

      // Detect section headers with emojis
      const sectionMatch = raw.match(/^(🍽️|🥘|📊|🍴|💡|🎯)\s*(.+)$/);
      if (sectionMatch) {
        const emoji = sectionMatch[1];
        const text = sectionMatch[2];
        currentSection = emoji;
        out.push(`<div class="section-header"><span class="section-emoji">${emoji}</span> ${text}</div>`);
        continue;
      }

      // For content under specific sections, format appropriately
      if (currentSection) {
        // Under "Alimentos detectados" and "Información nutricional" - each line is a food item
        if ((currentSection === '🥘' || currentSection === '📊') && raw.includes(':')) {
          out.push(`<div class="food-item">${raw}</div>`);
          continue;
        }
        
        // Under "Análisis de la comida", "Recomendaciones" - format as info items
        if ((currentSection === '🍴' || currentSection === '💡') && raw.includes(':')) {
          const [label, ...rest] = raw.split(':');
          const value = rest.join(':').trim();
          out.push(`<div class="info-item"><span class="info-label">${label}:</span> ${value}</div>`);
          continue;
        }

        // Under "Resumen rápido" - special formatting
        if (currentSection === '�') {
          out.push(`<div class="summary-text">${raw}</div>`);
          continue;
        }
      }

      // Regular descriptive text
      out.push(`<div class="description-text">${raw}</div>`);
    }

    const html = out.join('\n');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
