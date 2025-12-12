
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PromptAnalyzerComponent } from './components/prompt-analyzer/prompt-analyzer.component';
import { SmartTagBuilderComponent } from './components/smart-tag-builder/smart-tag-builder.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  template: `
    <main class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-800 antialiased">
      <!-- Navigation -->
      <nav class="bg-white shadow-md border-b border-gray-200">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">BetterAsk</h1>
          </div>
          <div class="flex gap-3">
            <button
              (click)="activeTab.set('analyzer')"
              [class]="activeTab() === 'analyzer' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
              class="px-4 py-2 rounded-lg font-semibold transition-all duration-200 border-2 border-purple-200">
              Prompt Analyzer
            </button>
            <button
              (click)="activeTab.set('builder')"
              [class]="activeTab() === 'builder' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
              class="px-4 py-2 rounded-lg font-semibold transition-all duration-200 border-2 border-green-200">
              Smart Tag Builder
            </button>
          </div>
        </div>
      </nav>

      <!-- Content -->
      @if (activeTab() === 'analyzer') {
        <app-prompt-analyzer></app-prompt-analyzer>
      } @else {
        <app-smart-tag-builder></app-smart-tag-builder>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PromptAnalyzerComponent, SmartTagBuilderComponent]
})
export class AppComponent {
  activeTab = signal<'analyzer' | 'builder'>('builder');
}

