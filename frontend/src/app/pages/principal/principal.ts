import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Importar RouterModule

@Component({
  selector: 'app-principal',
  imports: [RouterModule], // Agregar RouterModule a los imports
  templateUrl: './principal.html',
  styleUrl: './principal.scss'
})
export class Principal {
}