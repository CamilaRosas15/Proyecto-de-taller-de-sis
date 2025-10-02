import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { RecetasComponent } from './recetas/recetas.component';

@NgModule({
  declarations: [ AppComponent, RecetasComponent ],
  imports: [ BrowserModule, HttpClientModule, FormsModule ],
  bootstrap: [AppComponent]
})
export class AppModule {}