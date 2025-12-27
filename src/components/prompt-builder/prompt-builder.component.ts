import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GeminiService } from '../../services/gemini.service';
import { SmartTag } from '../../models/smart-tag.model';

type Persona = 'Teacher' | 'Parents' | 'Students';

const PERSONA_INTENTS: Record<Persona, string[]> = {
  'Students': ['Homework Help', 'Project Ideas', 'Learn Concept', 'Exam Prep', 'Clear Doubt'],
  'Parents': ['Help Homework', 'Help Project', 'Explain Simply', 'Find Resources', 'Play & Learn'],
  'Teacher': ['Generate Questions', 'Create Explanation', 'Simplify Weak', 'Use Analogy', 'Latest Research']
};

const CONFLICT_PAIRS = [
  ['Brief Topic Summary', 'Deep Dive Explanation'],
  ['Step By Step Guide', 'Brief Topic Summary']
];

const FALLBACK_TAGS: Record<Persona, SmartTag[]> = {
  'Teacher': [
    { text: 'Include Real Life Example', category: 'Add Context' },
    { text: 'Explain Step By Step', category: 'Reasoning Help' },
    { text: 'Use Simple Analogy', category: 'Reasoning Help' },
    { text: 'Create Practice Questions', category: 'Task Instruction' },
    { text: 'Highlight Key Terms', category: 'Format Constraints' }
  ],
  'Parents': [
    { text: 'Explain Like I\'m 5', category: 'Persona Style' },
    { text: 'Give Fun Activity', category: 'Task Instruction' },
    { text: 'Use Daily Objects', category: 'Add Context' },
    { text: 'Keep It Short', category: 'Format Constraints' },
    { text: 'Encourage Curiosity', category: 'Persona Style' }
  ],
  'Students': [
    { text: 'Give Exam Tips', category: 'Task Instruction' },
    { text: 'Summarize Key Points', category: 'Format Constraints' },
    { text: 'Explain The Logic', category: 'Reasoning Help' },
    { text: 'Compare With Similar', category: 'Reasoning Help' },
    { text: 'Use Bullet Points', category: 'Format Constraints' }
  ]
};

@Component({
  selector: 'app-prompt-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prompt-builder.component.html',
  styleUrls: ['./prompt-builder.component.css']
})
export class PromptBuilderComponent {
  activePersona = signal<Persona>('Teacher');
  classLevel = signal<number>(8); // Default Class 8
  activeIntent = signal<string>('');
  bannerMessage = signal<string | null>(null);

  // Form fields
  topic = signal('');

  // Debounced signals for preview generation
  debouncedTopic = signal('');
  
  // Smart Tags State
  availableSmartTags = signal<SmartTag[]>([]);
  selectedSmartTags = signal<string[]>([]);
  isLoadingTags = signal(false);

  // Output Tags State
  availableOutputTags = signal<{id: string, text: string, isDefault: boolean}[]>([]);
  selectedOutputTags = signal<string[]>([]);
  
  // Validation state
  topicError = signal<string | null>(null);
  isShaking = signal(false);
  isCopied = signal(false);
  
  // Debounce subjects
  topicSubject = new Subject<string>();

  // Recent Prompts
  recentPrompts = signal<any[]>([]);

  currentIntents = computed(() => PERSONA_INTENTS[this.activePersona()]);

  promptStrength = computed(() => {
    const count = this.selectedSmartTags().length;
    if (count >= 6) return { label: 'Expert', color: 'text-green-400', barColor: 'bg-green-500', icon: '🟢', width: '100%' };
    if (count >= 3) return { label: 'Good', color: 'text-yellow-400', barColor: 'bg-yellow-500', icon: '🟡', width: '66%' };
    return { label: 'Basic', color: 'text-red-400', barColor: 'bg-red-500', icon: '🔴', width: '33%' };
  });

  conflictWarning = computed(() => {
    const selected = this.selectedSmartTags();
    for (const pair of CONFLICT_PAIRS) {
      const [tag1, tag2] = pair;
      if (selected.includes(tag1) && selected.includes(tag2)) {
        return `⚠️ These suggestions may conflict. You might want to choose either "${tag1}" OR "${tag2}".`;
      }
    }
    return null;
  });

  assembledPrompt = computed(() => {
    const currentTopic = this.debouncedTopic();
    if (!currentTopic || currentTopic.length < 4) return '';

    const parts = [];
    
    // 1. Core Context
    parts.push(`User Persona: ${this.activePersona()}`);
    parts.push(`Grade/Class Level: ${this.classLevel()}`);
    parts.push(`User Intent: ${this.activeIntent()}`);
    parts.push(`Topic: ${currentTopic}`);

    // 2. Requirements (Selected Tags or Safe Defaults)
    const tags = this.selectedSmartTags();
    if (tags.length > 0) {
      // Deduplicate tags just in case
      const uniqueTags = [...new Set(tags)];
      parts.push(`Key Requirements:\n- ${uniqueTags.join('\n- ')}`);
    } else {
      // Safe Defaults (Deterministic)
      parts.push(`Key Requirements:\n- Explain the concept clearly and simply.\n- Ensure the content is appropriate for a ${this.activePersona()}.`);
    }

    // 3. Output Format
    const outputTags = this.selectedOutputTags();
    if (outputTags.length > 0) {
      parts.push(`Output Format:\n- ${outputTags.join('\n- ')}`);
    }

    // 4. Clear Output Instruction
    parts.push(`Output Instruction: Please generate a response that directly addresses the topic and intent, strictly adhering to the requirements above.`);
    
    return parts.join('\n\n');
  });

  constructor(private geminiService: GeminiService) {
    // Initialize default intent
    this.activeIntent.set(PERSONA_INTENTS['Teacher'][0]);

    // Setup debounce for topic
    this.topicSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(value => {
      this.debouncedTopic.set(value);
      if (value.length >= 4) {
        this.loadSmartTags();
      } else {
        this.availableSmartTags.set([]);
        this.availableOutputTags.set([]);
      }
    });

    // Load recent prompts
    this.loadRecentPrompts();
  }

  onClassLevelChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.classLevel.set(value);
    
    // Clear state on class change
    this.selectedSmartTags.set([]);
    
    // Reload tags if topic is present
    if (this.topic().length >= 4) {
      this.loadSmartTags();
    }
  }

  onTopicChange(value: string) {
    this.topic.set(value);
    
    // Clear error as soon as user types
    if (this.topicError()) {
      this.topicError.set(null);
    }
    
    this.topicSubject.next(value);
  }

  async loadSmartTags(resetSelection = true) {
    const persona = this.activePersona();
    const intent = this.activeIntent();
    const topic = this.topic();
    
    if (topic.length < 4) return;

    this.isLoadingTags.set(true);
    
    // Clear existing to prevent flash
    this.availableSmartTags.set([]);
    this.availableOutputTags.set([]);
    
    try {
      const [aiResponse, outputResponse] = await Promise.all([
        this.geminiService.generateSmartTags({
          topic,
          intent,
          persona,
          stage: 1,
          selectedTags: [],
          avoidDuplicates: true
        }),
        this.geminiService.generateOutputSuggestions({
          topic,
          intent,
          persona,
          selectedSmartTags: [],
          selectedOutputTags: []
        })
      ]);

      if (aiResponse.success && aiResponse.tags.length > 0) {
        const normalizedTags = this.normalizeTags(aiResponse.tags);
        this.availableSmartTags.set(normalizedTags);
        
        if (aiResponse.fallback) {
          const msg = aiResponse.message || 'Using fallback suggestions.';
          this.bannerMessage.set(`⚠️ ${msg}`);
          setTimeout(() => this.bannerMessage.set(null), 5000);
        }

        if (resetSelection) {
          this.selectedSmartTags.set([]);
        }
      } else {
        // Fallback: Use fixed list
        this.availableSmartTags.set(FALLBACK_TAGS[persona]);
        
        const msg = aiResponse.message || 'Using offline suggestions.';
        this.bannerMessage.set(`⚠️ ${msg}`);
        setTimeout(() => this.bannerMessage.set(null), 5000);
      }

      // Handle Output Tags
      const outputTags = [
        { id: 'def-1', text: 'Bullet points', isDefault: true },
        { id: 'def-2', text: 'Short summary', isDefault: true }
      ];
      
      if (outputResponse.success && outputResponse.suggestions) {
        outputResponse.suggestions.slice(0, 3).forEach((text, idx) => {
          outputTags.push({ id: `ai-${idx}`, text, isDefault: false });
        });
      }
      this.availableOutputTags.set(outputTags);
      
      if (resetSelection) {
        this.selectedOutputTags.set(['Bullet points']);
      }

    } finally {
      this.isLoadingTags.set(false);
    }
  }

  normalizeTags(tags: SmartTag[]): SmartTag[] {
    return tags.map(tag => ({
      ...tag,
      text: this.toTitleCase(tag.text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ''))
    }));
  }

  toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
  }

  refreshTags() {
    this.loadSmartTags(true);
  }

  toggleSmartTag(tagText: string) {
    const current = this.selectedSmartTags();
    if (current.includes(tagText)) {
      this.selectedSmartTags.set(current.filter(t => t !== tagText));
    } else {
      // Enforce max 8 tags
      if (current.length >= 8) return;
      this.selectedSmartTags.set([...current, tagText]);
    }
  }
  
  toggleOutputTag(tagText: string) {
    const current = this.selectedOutputTags();
    if (current.includes(tagText)) {
      this.selectedOutputTags.set(current.filter(t => t !== tagText));
    } else {
      // Enforce max 3 output tags
      if (current.length >= 3) return;
      this.selectedOutputTags.set([...current, tagText]);
    }
  }

  loadRecentPrompts() {
    // Disabled persistence
    this.recentPrompts.set([]);
    /*
    try {
      const recent = JSON.parse(sessionStorage.getItem('recent-prompts') || '[]');
      this.recentPrompts.set(recent);
    } catch (e) {
      this.recentPrompts.set([]);
    }
    */
  }

  useRecentPrompt(recent: any) {
    this.topic.set(recent.topic);
    this.debouncedTopic.set(recent.topic);
    
    if (recent.persona) {
      this.setPersona(recent.persona);
    }
    
    if (recent.intent) {
      this.activeIntent.set(recent.intent);
    }
    
    // We don't restore selected tags to keep it "fresh" but context aware, 
    // or we could if we stored them. The current saveToHistory doesn't seem to store selectedTags explicitly
    // but it stores the assembled prompt.
    // Let's just restore topic/persona/intent which triggers tag loading.
  }

  clearSession() {
    // sessionStorage.removeItem('recent-prompts');
    this.recentPrompts.set([]);
  }

  private saveToHistory() {
    const currentTopic = this.topic();
    // Save to session storage (Recent Prompts)
    // const recent = JSON.parse(sessionStorage.getItem('recent-prompts') || '[]');
    const recent = this.recentPrompts();
    
    // Create new entry
    const newEntry = {
      topic: currentTopic || 'Untitled',
      intent: this.activeIntent(),
      persona: this.activePersona(),
      prompt: this.assembledPrompt(),
      date: new Date().toISOString()
    };
    
    // Add to front
    const updated = [newEntry, ...recent];
    
    // Keep last 10
    if (updated.length > 10) updated.pop();
    
    // sessionStorage.setItem('recent-prompts', JSON.stringify(recent));
    this.recentPrompts.set(updated);
  }

  setPersona(persona: Persona) {
    if (this.activePersona() === persona) return;
    
    this.activePersona.set(persona);
    // Set default active intent for new persona
    this.activeIntent.set(PERSONA_INTENTS[persona][0]);
    
    // Clear fields except topic/context to reset generated output and selections
    this.selectedSmartTags.set([]);
    
    // Re-evaluate smart tags if topic is present
    if (this.topic().length >= 4) {
      this.loadSmartTags();
    }
    
    // Show banner
    this.bannerMessage.set(`ℹ️ Switched to ${persona} mode. Suggestions updated.`);
    setTimeout(() => this.bannerMessage.set(null), 3000);
  }

  setIntent(intent: string) {
    this.activeIntent.set(intent);
    
    // Clear selected tags on intent change
    this.selectedSmartTags.set([]);

    // Reload tags for new intent
    if (this.topic().length >= 4) {
      this.loadSmartTags();
    }
  }

  copyToClipboard() {
    if (!this.assembledPrompt()) return;
    navigator.clipboard.writeText(this.assembledPrompt());
    
    this.saveToHistory();
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  shareToWhatsApp() {
    if (!this.assembledPrompt()) return;
    
    this.saveToHistory();
    const text = `*Topic:* ${this.topic()}
*Intent:* ${this.activeIntent()}

*Prompt:*
${this.assembledPrompt()}

Built with BetterAskPrompt: ${window.location.origin}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  hardReset() {
    if (confirm('This will reset all app data (except onboarding). Are you sure?')) {
      // localStorage.removeItem('prompt-builder-draft');
      // sessionStorage.removeItem('recent-prompts');
      // localStorage.removeItem('betterask_last_preset');
      // localStorage.removeItem('betterask_prompt_count');
      
      // Reset local state
      this.topic.set('');
      this.selectedSmartTags.set([]);
      this.recentPrompts.set([]);
      
      window.location.reload();
    }
  }

  clear() {
    if (confirm('Are you sure you want to clear all fields?')) {
      this.selectedSmartTags.set([]);
    }
  }
}
