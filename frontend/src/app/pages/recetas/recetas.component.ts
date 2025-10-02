import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export class RecetasComponent {
  pregunta: string = "";
  receta: any = null;
  historial: any[] = [];

  constructor(private http: HttpClient) {}

  pedirReceta() {
    this.http.post("http://localhost:3000/recomendaciones", { prompt: this.pregunta })
      .subscribe({
        next: (res: any) => {
          this.receta = res;
          this.historial.unshift(res);  // agrega al historial
        },
        error: err => console.error("Error:", err)
      });
  }
}