import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type Persona = 'Teacher' | 'Parents' | 'Students';

const PERSONA_INTENTS: Record<Persona, string[]> = {
  'Students': ['Homework Help', 'Project Ideas', 'Learn Concept', 'Exam Prep', 'Clear Doubt'],
  'Parents': ['Help Homework', 'Help Project', 'Explain Simply', 'Find Resources', 'Play & Learn'],
  'Teacher': ['Generate Questions', 'Create Explanation', 'Simplify Weak', 'Use Analogy', 'Latest Research']
};

const CONFLICT_PAIRS = [
  ['Summary', 'Deep Dive'],
  ['Simple Explanation', 'Deep Dive'],
  ['EL5', 'Deep Dive'],
  ['Step-by-step', 'Summary'],
  ['Short & Concise', 'Detailed & Comprehensive']
];

const SMART_TAGS_DATA: Record<Persona, Record<string, string[]>> = {
  'Teacher': {
    'Generate Questions': ['Multiple Choice', 'Critical Thinking', 'Real-world Application', 'Bloom\'s Taxonomy', 'Answer Key'],
    'Create Explanation': ['Step-by-step', 'Visual Aids', 'Real-life Examples', 'Common Misconceptions', 'Interactive Elements'],
    'Simplify Weak': ['Core Concepts', 'Visual Analogies', 'Practice Problems', 'Confidence Building', 'Step-by-step Guide'],
    'Use Analogy': ['Everyday Life', 'Sports', 'Cooking', 'Nature', 'Technology'],
    'Latest Research': ['Key Findings', 'Methodology', 'Implications', 'Summary', 'Citations']
  },
  'Parents': {
    'Help Homework': ['Step-by-step', 'Don\'t Solve Directly', 'Guiding Questions', 'Encouragement', 'Check Understanding'],
    'Help Project': ['Brainstorming', 'Materials List', 'Timeline', 'Creative Ideas', 'Safety Tips'],
    'Explain Simply': ['EL5', 'Real-world Examples', 'No Jargon', 'Visuals', 'Fun Facts'],
    'Find Resources': ['Videos', 'Articles', 'Games', 'Books', 'Worksheets'],
    'Play & Learn': ['Educational Games', 'Outdoor Activities', 'DIY Crafts', 'Science Experiments', 'Storytelling']
  },
  'Students': {
    'Homework Help': ['Explain Concept', 'Hint', 'Similar Example', 'Step-by-step', 'Check Answer'],
    'Project Ideas': ['Creative', 'Feasible', 'Unique', 'Science Fair', 'Artistic'],
    'Learn Concept': ['Deep Dive', 'Summary', 'Key Points', 'Quiz Me', 'Examples'],
    'Exam Prep': ['Practice Questions', 'Flashcards', 'Summary Sheet', 'Time Management', 'Key Formulas'],
    'Clear Doubt': ['Simple Explanation', 'Analogy', 'Example', 'Diagram Description', 'Why/How']
  }
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
  activeIntent = signal<string>('');
  bannerMessage = signal<string | null>(null);

  // Form fields
  topic = signal('');

  // Debounced signals for preview generation
  debouncedTopic = signal('');
  
  // Smart Tags State
  availableSmartTags = signal<string[]>([]);
  selectedSmartTags = signal<string[]>([]);
  revealStage = signal<0 | 1 | 2>(0); // 0: Hidden, 1: First 3, 2: All 5
  
  // Validation state
  topicError = signal<string | null>(null);
  isShaking = signal(false);
  isCopied = signal(false);
  
  // Debounce subjects
  topicSubject = new Subject<string>();

  currentIntents = computed(() => PERSONA_INTENTS[this.activePersona()]);

  promptStrength = computed(() => {
    const count = this.selectedSmartTags().length;
    if (count >= 5) return { label: 'Expert', color: 'text-green-400', barColor: 'bg-green-500', icon: '🟢', width: '100%' };
    if (count >= 2) return { label: 'Good', color: 'text-yellow-400', barColor: 'bg-yellow-500', icon: '🟡', width: '66%' };
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

    // 3. Clear Output Instruction
    parts.push(`Output Instruction: Please generate a response that directly addresses the topic and intent, strictly adhering to the requirements above.`);
    
    return parts.join('\n\n');
  });

  constructor() {
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
        this.revealStage.set(0);
      }
    });

    // Load from localStorage
    const saved = localStorage.getItem('prompt-builder-draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.topic.set(data.topic || '');
        this.debouncedTopic.set(data.topic || '');

        this.selectedSmartTags.set(data.selectedSmartTags || []);
        
        if (data.activePersona) {
          this.activePersona.set(data.activePersona);
          // Ensure active intent is valid for current persona, otherwise reset to first
          if (data.activeIntent && PERSONA_INTENTS[data.activePersona].includes(data.activeIntent)) {
            this.activeIntent.set(data.activeIntent);
          } else {
            this.activeIntent.set(PERSONA_INTENTS[data.activePersona][0]);
          }
        }
        
        // Restore reveal stage if topic is valid
        if (this.topic().length >= 4) {
          this.loadSmartTags(false); // Don't reset selection
          if (this.selectedSmartTags().length > 0) {
            this.revealStage.set(2);
          }
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }

    // Auto-save effect
    effect(() => {
      const data = {
        topic: this.topic(),
        activePersona: this.activePersona(),
        activeIntent: this.activeIntent(),
        selectedSmartTags: this.selectedSmartTags()
      };
      localStorage.setItem('prompt-builder-draft', JSON.stringify(data));
    });
  }

  onTopicChange(value: string) {
    this.topic.set(value);
    
    // Clear error as soon as user types
    if (this.topicError()) {
      this.topicError.set(null);
    }
    
    this.topicSubject.next(value);
  }

  loadSmartTags(resetSelection = true) {
    const persona = this.activePersona();
    const intent = this.activeIntent();
    
    // Simulate network check / fallback logic
    // In a real app, this would try an API first, then fall back.
    // Since we are using static data for V1.1/V1.2, this IS the fallback/offline-ready data.
    const tags = SMART_TAGS_DATA[persona]?.[intent] || [];
    
    // Check if we are "offline" (simulated check or real navigator.onLine)
    if (!navigator.onLine) {
       this.bannerMessage.set('⚠️ Offline: Showing basic suggestions');
       setTimeout(() => this.bannerMessage.set(null), 3000);
    }

    this.availableSmartTags.set(tags);
    
    if (resetSelection) {
      this.selectedSmartTags.set([]);
      this.revealStage.set(1); // Show first 3
    } else {
      // If restoring, ensure we show enough tags
      this.revealStage.set(this.selectedSmartTags().length > 0 ? 2 : 1);
    }
  }

  toggleSmartTag(tag: string) {
    const current = this.selectedSmartTags();
    if (current.includes(tag)) {
      this.selectedSmartTags.set(current.filter(t => t !== tag));
    } else {
      // Enforce max 5 tags
      if (current.length >= 5) return;
      
      this.selectedSmartTags.set([...current, tag]);
      
      // Progressive reveal: if user selects a tag and we are in stage 1, move to stage 2
      if (this.revealStage() === 1) {
        this.getNext2Tags(); // Fetch next best tags
        this.revealStage.set(2);
      }
    }
  }

  getNext2Tags() {
    // In a real backend scenario, this would call an API with:
    // { selectedTags: this.selectedSmartTags(), visibleTags: this.availableSmartTags().slice(0,3), ... }
    
    // For V1.2 Static/Fallback Logic:
    // We already have all 5 tags loaded in availableSmartTags.
    // The UI simply reveals index 3 and 4.
    // To make this "context-aware" in a static context, we could re-sort the remaining tags
    // based on the first selection, but since our static data is already curated sets,
    // the simplest robust implementation is to ensure we don't duplicate and just reveal.
    
    // If we were fetching dynamically, we would append to availableSmartTags here.
    // Example:
    // const nextTags = fetchMoreTags(...);
    // this.availableSmartTags.update(tags => [...tags, ...nextTags]);
    
    // Since we pre-load 5, we just ensure no duplicates exist (already handled by Set/Static data structure)
    // and let the UI reveal them.
  }

  private saveToHistory() {
    const currentTopic = this.topic();
    // Save to session storage (Recent Prompts)
    const recent = JSON.parse(sessionStorage.getItem('recent-prompts') || '[]');
    recent.unshift({
      topic: currentTopic || 'Untitled',
      intent: this.activeIntent(),
      persona: this.activePersona(),
      prompt: this.assembledPrompt(),
      date: new Date().toISOString()
    });
    // Keep last 10
    if (recent.length > 10) recent.pop();
    sessionStorage.setItem('recent-prompts', JSON.stringify(recent));
  }

  setPersona(persona: Persona) {
    if (this.activePersona() === persona) return;
    
    this.activePersona.set(persona);
    // Set default active intent for new persona
    this.activeIntent.set(PERSONA_INTENTS[persona][0]);
    
    // Clear fields except topic/context to reset generated output and selections
    this.selectedSmartTags.set([]);
    this.revealStage.set(0);
    
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

  clear() {
    if (confirm('Are you sure you want to clear all fields?')) {
      this.selectedSmartTags.set([]);
      this.revealStage.set(0);
    }
  }
}
