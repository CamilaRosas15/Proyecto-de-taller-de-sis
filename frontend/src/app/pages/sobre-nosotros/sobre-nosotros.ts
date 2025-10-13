import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,                              
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sobre-nosotros.html',
  styleUrls: ['./sobre-nosotros.scss']          
})
export class SobreNosotros {}
