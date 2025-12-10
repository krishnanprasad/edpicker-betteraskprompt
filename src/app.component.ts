
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PromptAnalyzerComponent } from './components/prompt-analyzer/prompt-analyzer.component';

@Component({
  selector: 'app-root',
  template: `
    <main class="min-h-screen text-gray-800 antialiased">
      <app-prompt-analyzer></app-prompt-analyzer>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PromptAnalyzerComponent]
})
export class AppComponent {}
