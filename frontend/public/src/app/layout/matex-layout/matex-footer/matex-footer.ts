import { Component } from '@angular/core';

@Component({
  selector: 'app-matex-footer',
  templateUrl: './matex-footer.html',
  styleUrl: './matex-footer.scss',
})
export class MatexFooter {
  readonly year = new Date().getFullYear();
}
