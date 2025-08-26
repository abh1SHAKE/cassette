import { Component } from '@angular/core';
import { FlowComponent } from './sections/flow/flow.component';

@Component({
  selector: 'app-root',
  imports: [FlowComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
}
