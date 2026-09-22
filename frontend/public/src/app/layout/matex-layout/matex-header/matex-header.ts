import { Component } from '@angular/core';

import { Language } from '../../../shared/components/header/widgets/language/language';

@Component({
  selector: 'app-matex-header',
  imports: [Language],
  templateUrl: './matex-header.html',
  styleUrl: './matex-header.scss',
})
export class MatexHeader {}
