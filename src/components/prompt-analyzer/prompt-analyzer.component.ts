
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { GeminiService } from '../../services/gemini.service';
import { PromptAnalysis } from '../../models/prompt-analysis.model';

@Component({
  selector: 'app-prompt-analyzer',
  templateUrl: './prompt-analyzer.component.html',
  styleUrls: ['./prompt-analyzer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptAnalyzerComponent {
  private readonly geminiService = inject(GeminiService);
  
  analysis = signal<PromptAnalysis | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  promptInput = signal<string>('Explain photosynthesis.');

  openSuggestionCategory = signal<string | null>(null);

  suggestionCategories = [
    {
      category: 'Add Role',
      options: [
        { label: 'As a Teacher', value: 'Act as a teacher explaining this concept.' },
        { label: 'As a Socratic Tutor', value: 'Act as a tutor who asks me questions to help me learn.' },
        { label: 'As an Expert', value: 'Act as a subject matter expert in [FIELD].' },
        { label: 'As a Friend', value: 'Explain it to me like a friend would.' },
      ]
    },
    {
      category: 'Define Format',
      options: [
        { label: 'In bullet points', value: 'Summarize the key points in bullet points.' },
        { label: 'As a table', value: 'Organize the information in a table format.' },
        { label: 'As a JSON object', value: 'Provide the output as a valid JSON object.' },
        { label: 'As a step-by-step guide', value: 'Provide a step-by-step guide.' },
      ]
    },
    {
      category: 'Set Tone',
      options: [
        { label: 'Formal', value: 'Use a formal and academic tone.' },
        { label: 'Casual & Friendly', value: 'Use a casual and friendly tone.' },
        { label: 'Persuasive', value: 'Use a persuasive and compelling tone.' },
        { label: 'Simple and clear', value: 'Use simple language that is easy to understand.' },
      ]
    },
    {
      category: 'Specify Audience',
      options: [
        { label: 'For a Beginner', value: 'Explain it for a complete beginner with no prior knowledge.' },
        { label: 'For an Expert', value: 'Explain it for an expert in the field.' },
        { label: 'For a 10-year-old', value: 'Explain it like I\'m 10 years old.' },
        { label: 'For a college student', value: 'Explain it at a college undergraduate level.' },
      ]
    },
    {
      category: 'Add Constraints',
      options: [
        { label: 'Under 100 words', value: 'Keep the response under 100 words.' },
        { label: 'Focus on [TOPIC]', value: 'Focus specifically on [TOPIC] and exclude other details.' },
        { label: 'Do not use jargon', value: 'Avoid using technical jargon.' },
      ]
    },
    {
      category: 'Ask for Examples',
      options: [
        { label: 'Provide a real-world example', value: 'Provide a real-world example to illustrate the concept.' },
        { label: 'Include an analogy', value: 'Use an analogy to help me understand.' },
        { label: 'Show me a code snippet', value: 'Include a code snippet as an example.' },
      ]
    }
  ];

  toggleSuggestionCategory(category: string): void {
    this.openSuggestionCategory.update(current => current === category ? null : category);
  }

  addSuggestionToPrompt(suggestion: string): void {
    this.promptInput.update(current => `${current} ${suggestion}`.trim());
    this.openSuggestionCategory.set(null); // Close dropdown after selection
  }

  async analyzePrompt(): Promise<void> {
    const prompt = this.promptInput().trim();
    if (!prompt || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.analysis.set(null);

    try {
      const result = await this.geminiService.analyzeStudentPrompt(prompt);
      this.analysis.set(result);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  getScoreColor(score: number): string {
    if (score < 40) return 'text-red-500';
    if (score < 75) return 'text-amber-500';
    return 'text-green-500';
  }

  getScoreRingColor(score: number): string {
    if (score < 40) return 'stroke-red-500';
    if (score < 75) return 'stroke-amber-500';
    return 'stroke-green-500';
  }

  getScoreTrackColor(score: number): string {
    if (score < 40) return 'stroke-red-500/20';
    if (score < 75) return 'stroke-amber-500/20';
    return 'stroke-green-500/20';
  }
  
  getStrokeDashArray(score: number): string {
    const radius = 20; // smaller radius for the left panel
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    return `${progress} ${circumference}`;
  }
  
  copyToClipboard(text: string | undefined): void {
    if (!text) return;
    navigator.clipboard.writeText(text);
  }

  readonly fullImprovedPromptText = computed(() => {
    const p = this.analysis()?.improvedPrompt;
    if (!p) return '';
    
    let fullText = '';
    if (p.role) fullText += `As ${p.role}, `;
    if (p.persona) fullText += `adopting a ${p.persona} persona, `;
    if (p.context) fullText += `given the context that ${p.context}, `;
    fullText += `${p.task}. `;
    if (p.tone) fullText += `The tone should be ${p.tone}. `;
    if (p.format) fullText += `Please provide the output in the format of ${p.format}.`;
    if (p.exemplars && p.exemplars.length > 0) {
        fullText += ` For example: ${p.exemplars.join(', ')}.`;
    }
    return fullText.trim();
  });
}
