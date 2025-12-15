import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GeminiService } from '../../services/gemini.service';

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

const SMART_TAGS_DATA: Record<Persona, Record<string, string[]>> = {
  'Teacher': {
    'Generate Questions': ['Multiple Choice Questions', 'Critical Thinking Tasks', 'Real World Application', 'Blooms Taxonomy Levels', 'Include Answer Key', 'Mixed Difficulty Levels', 'Full Topic Coverage', 'Set Time Limit'],
    'Create Explanation': ['Step By Step Guide', 'Include Visual Aids', 'Real Life Examples', 'Common Student Mistakes', 'Interactive Class Elements', 'Use Simple Analogy', 'Check For Understanding', 'Brief Topic Summary'],
    'Simplify Weak': ['Focus Core Concepts', 'Use Visual Analogies', 'Easy Practice Problems', 'Build Student Confidence', 'Step By Step Guide', 'Memory Aid Mnemonic', 'Simple Visual Aid', 'Real World Link'],
    'Use Analogy': ['Everyday Life Analogy', 'Sports Related Analogy', 'Cooking Baking Analogy', 'Nature Based Analogy', 'Modern Tech Analogy', 'Historical Event Analogy', 'Pop Culture Reference', 'Car Vehicle Analogy'],
    'Latest Research': ['Key Research Findings', 'Research Methodology Details', 'Practical Classroom Implications', 'Brief Research Summary', 'Include Academic Citations', 'Relevant Data Statistics', 'Subject Expert Quotes', 'Future Research Trends']
  },
  'Parents': {
    'Help Homework': ['Step By Step Guide', 'Dont Solve Directly', 'Ask Guiding Questions', 'Offer Encouragement Words', 'Check Child Understanding', 'Show Patience Tips', 'Positive Reinforcement', 'Break Down Task'],
    'Help Project': ['Brainstorming Session Ideas', 'Required Materials List', 'Project Timeline Plan', 'Creative Project Ideas', 'Safety Precautions Tips', 'Budget Friendly Options', 'Use Recycled Materials', 'Define Parent Role'],
    'Explain Simply': ['Explain Like Five', 'Real World Examples', 'No Complex Jargon', 'Use Visual Aids', 'Include Fun Facts', 'Simple Drawing Ideas', 'Tell Short Story', 'Learning Game Idea'],
    'Find Resources': ['Educational Video Links', 'Readable Article Links', 'Learning Game Links', 'Book Recommendations List', 'Printable Worksheet Links', 'Learning App Links', 'Museum Visit Ideas', 'Documentary Video Links'],
    'Play & Learn': ['Educational Game Ideas', 'Outdoor Activity Ideas', 'DIY Craft Project', 'Home Science Experiment', 'Interactive Storytelling Time', 'Music And Songs', 'Physical Movement Activity', 'Role Play Scenario']
  },
  'Students': {
    'Homework Help': ['Explain Core Concept', 'Give Helpful Hint', 'Show Similar Example', 'Step By Step Guide', 'Check My Answer', 'Show Relevant Formula', 'Define Key Terms', 'Highlight Key Concept'],
    'Project Ideas': ['Creative Project Ideas', 'Feasible For Student', 'Unique Project Angle', 'Science Fair Project', 'Artistic Project Ideas', 'Low Cost Materials', 'Quick To Complete', 'Group Project Ideas'],
    'Learn Concept': ['Deep Dive Explanation', 'Brief Topic Summary', 'Key Learning Points', 'Quiz Me Now', 'Real World Examples', 'Historical Timeline View', 'Compare And Contrast', 'Cause And Effect'],
    'Exam Prep': ['Practice Exam Questions', 'Flashcard Study Points', 'One Page Summary', 'Time Management Tips', 'List Key Formulas', 'Past Paper Questions', 'Mock Test Simulation', 'Create Study Plan'],
    'Clear Doubt': ['Simple Clear Explanation', 'Use Simple Analogy', 'Show Concrete Example', 'Describe Visual Diagram', 'Explain Why How', 'Step By Step Guide', 'Visual Representation Idea', 'Link Related Topic']
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
  revealStage = signal<0 | 1 | 2>(0); // 0: Hidden, 1: First 3, 2: All 8
  isLoadingTags = signal(false);
  
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
        this.revealStage.set(0);
      }
    });

    // Load recent prompts
    this.loadRecentPrompts();

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

  async loadSmartTags(resetSelection = true) {
    const persona = this.activePersona();
    const intent = this.activeIntent();
    const topic = this.topic();
    
    if (topic.length < 4) return;

    this.isLoadingTags.set(true);
    
    // Try AI first
    const aiResponse = await this.geminiService.generateSmartTags({
      topic,
      intent,
      persona,
      stage: 1
    });

    if (aiResponse.success && aiResponse.tags.length > 0) {
      // Filter for short tags (3-4 words)
      const shortTags = aiResponse.tags.filter(t => t.split(' ').length <= 4);
      this.availableSmartTags.set(shortTags);
    } else {
      // Fallback to static data
      const tags = [...(SMART_TAGS_DATA[persona]?.[intent] || [])];
      this.availableSmartTags.set(tags);
      
      if (!navigator.onLine) {
         this.bannerMessage.set('⚠️ Offline: Showing basic suggestions');
         setTimeout(() => this.bannerMessage.set(null), 3000);
      }
    }

    this.isLoadingTags.set(false);
    
    if (resetSelection) {
      this.selectedSmartTags.set([]);
      this.revealStage.set(1); // Show first 3
    } else {
      // If restoring, ensure we show enough tags
      this.revealStage.set(this.selectedSmartTags().length > 0 ? 2 : 1);
    }
  }

  refreshSmartTags() {
    this.loadSmartTags(true);
  }

  toggleSmartTag(tag: string) {
    const current = this.selectedSmartTags();
    if (current.includes(tag)) {
      this.selectedSmartTags.set(current.filter(t => t !== tag));
    } else {
      // Enforce max 8 tags
      if (current.length >= 8) return;
      
      this.selectedSmartTags.set([...current, tag]);
      
      // Progressive reveal: if user selects a tag and we are in stage 1, move to stage 2
      if (this.revealStage() === 1) {
        this.getNext2Tags(); // Fetch next best tags
        this.revealStage.set(2);
      }
    }
  }

  async getNext2Tags() {
    const persona = this.activePersona();
    const intent = this.activeIntent();
    const topic = this.topic();
    
    this.isLoadingTags.set(true);

    const aiResponse = await this.geminiService.generateSmartTags({
      topic,
      intent,
      persona,
      stage: 2,
      selectedTags: this.selectedSmartTags(),
      avoidDuplicates: true
    });

    if (aiResponse.success && aiResponse.tags.length > 0) {
       const shortTags = aiResponse.tags.filter(t => t.split(' ').length <= 4);
       // Append, dedupe, cap to 8
       const current = this.availableSmartTags();
       const combined = [...new Set([...current, ...shortTags])].slice(0, 8);
       this.availableSmartTags.set(combined);
    }
    
    this.isLoadingTags.set(false);
  }

  loadRecentPrompts() {
    try {
      const recent = JSON.parse(sessionStorage.getItem('recent-prompts') || '[]');
      this.recentPrompts.set(recent);
    } catch (e) {
      this.recentPrompts.set([]);
    }
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
    sessionStorage.removeItem('recent-prompts');
    this.recentPrompts.set([]);
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
    this.recentPrompts.set(recent);
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
