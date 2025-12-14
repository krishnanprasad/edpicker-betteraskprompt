import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { 
  Intent, 
  TagItem, 
  DetectedMeta, 
  SmartTagsResponse, 
  PromptRequest 
} from '../models/smart-tag.model';

@Injectable({
  providedIn: 'root'
})
export class SmartTagService {
  // State signals
  private _intent = signal<Intent | null>(null);
  private _topic = signal<string>('');
  private _detectedMeta = signal<DetectedMeta | null>(null);
  private _availableTags = signal<TagItem[]>([]);
  private _selectedTags = signal<TagItem[]>([]);
  private _finalPrompt = signal<string>('');
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _isDefaultPrompt = signal<boolean>(false);
  private _conflictWarnings = signal<string[]>([]);
  private _isOnboardingComplete = signal<boolean>(false);
  private _showOnboarding = signal<boolean>(false);
  private _isOffline = signal<boolean>(false);
  private _recentPrompts = signal<Array<{ topic: string; prompt: string; timestamp: number }>>([]);
  
  // Public readonly signals
  readonly intent = this._intent.asReadonly();
  readonly topic = this._topic.asReadonly();
  readonly detectedMeta = this._detectedMeta.asReadonly();
  readonly availableTags = this._availableTags.asReadonly();
  readonly selectedTags = this._selectedTags.asReadonly();
  readonly finalPrompt = this._finalPrompt.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isDefaultPrompt = this._isDefaultPrompt.asReadonly();
  readonly conflictWarnings = this._conflictWarnings.asReadonly();
  readonly isOnboardingComplete = this._isOnboardingComplete.asReadonly();
  readonly showOnboarding = this._showOnboarding.asReadonly();
  readonly isOffline = this._isOffline.asReadonly();
  readonly recentPrompts = this._recentPrompts.asReadonly();
  
  // Computed signals
  readonly canGeneratePrompt = computed(() => 
    this._intent() !== null && 
    this._topic().length >= 4
  );
  
  readonly selectedCount = computed(() => this._selectedTags().length);
  readonly canSelectMore = computed(() => this._selectedTags().length < 5);
  
  // Debounce timer
  private debounceTimer: any = null;
  
  constructor(private http: HttpClient) {
    // Check onboarding status
    const hasSeenOnboarding = localStorage.getItem('betterask_onboarding_complete');
    this._isOnboardingComplete.set(hasSeenOnboarding === 'true');
    
    if (!hasSeenOnboarding) {
      // Show onboarding for first-time users
      this._showOnboarding.set(true);
    }
    
    // Load recent prompts from sessionStorage
    this.loadRecentPrompts();
    
    // Check online status
    this.checkOnlineStatus();
    window.addEventListener('online', () => this._isOffline.set(false));
    window.addEventListener('offline', () => this._isOffline.set(true));
  }
  
  // Set intent
  setIntent(intent: Intent): void {
    this._intent.set(intent);
    this._error.set(null);

    // If topic is already valid, trigger tag loading immediately
    if (this._topic().length >= 4) {
      this.loadSmartTags();
    }
  }
  
  // Set topic with auto-detection and debounced tag loading
  setTopic(topic: string): void {
    this._topic.set(topic);
    this._error.set(null);
    
    // Auto-detect metadata from topic
    this.detectMetaFromTopic(topic);
    
    // Debounced smart tag loading
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (topic.length >= 4 && this._intent()) {
      this.debounceTimer = setTimeout(() => {
        this.loadSmartTags();
      }, 500);
    } else {
      // Clear tags if topic too short
      this._availableTags.set([]);
      this._selectedTags.set([]);
    }
  }
  
  // Detect metadata from topic (simple heuristic)
  detectMetaFromTopic(topic: string): void {
    const topicLower = topic.toLowerCase();
    
    // Simple detection logic
    let detectedClass = 10;
    let detectedBoard = 'CBSE';
    let detectedSubject = 'General';
    
    // Detect class mentions
    const classMatch = topicLower.match(/class\s*(\d+)|(\d+)th\s*class|grade\s*(\d+)/);
    if (classMatch) {
      detectedClass = parseInt(classMatch[1] || classMatch[2] || classMatch[3]);
    }
    
    // Detect board mentions
    if (topicLower.includes('icse')) detectedBoard = 'ICSE';
    else if (topicLower.includes('state')) detectedBoard = 'State Board';
    
    // Detect subject mentions
    if (topicLower.includes('math') || topicLower.includes('algebra') || topicLower.includes('geometry')) {
      detectedSubject = 'Mathematics';
    } else if (topicLower.includes('science') || topicLower.includes('physics') || topicLower.includes('chemistry') || topicLower.includes('biology')) {
      detectedSubject = 'Science';
    } else if (topicLower.includes('english') || topicLower.includes('grammar') || topicLower.includes('literature')) {
      detectedSubject = 'English';
    } else if (topicLower.includes('history') || topicLower.includes('geography') || topicLower.includes('civics')) {
      detectedSubject = 'Social Studies';
    }
    
    this._detectedMeta.set({
      class: detectedClass,
      board: detectedBoard,
      subject: detectedSubject
    });
  }
  
  // Load smart tags from backend
  async loadSmartTags(): Promise<void> {
    const topic = this._topic();
    const intent = this._intent();
    
    if (!topic || topic.length < 4 || !intent) {
      return;
    }
    
    // Check if offline
    if (this._isOffline()) {
      this._error.set('No internet 📡. Using offline suggestions.');
      this.useFallbackTags();
      return;
    }
    
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      const endpoint = `${environment.apiBase}/tags/generate`; // Updated endpoint to match backend
      const response$ = this.http.post<SmartTagsResponse>(endpoint, {
        topic,
        intent,
        detected: this._detectedMeta()
      });
      
      const response = await firstValueFrom(response$);
      
      if (response.success) {
        // Convert response to TagItem array
        const tags: TagItem[] = [];
        let idCounter = 1;
        
        // Map backend categories to frontend categories
        // Backend: role, task, context, format, constraints
        // Frontend: role, context, output, tone, thinking
        
        const categoryMap: Record<string, string> = {
          'role': 'role',
          'context': 'context',
          'format': 'output',
          'constraints': 'tone', // Mapping constraints to tone for now
          'task': 'thinking'     // Mapping task to thinking for now
        };

        Object.keys(response.tags).forEach(backendCat => {
           const frontendCat = categoryMap[backendCat] || backendCat;
           // Only process if it's a valid frontend category
           if (['role', 'context', 'output', 'tone', 'thinking'].includes(frontendCat)) {
             const categoryTags = response.tags[backendCat] || [];
             categoryTags.forEach((text: string) => {
               tags.push({
                 id: `tag-${idCounter++}`,
                 text,
                 category: frontendCat as any,
                 selected: false
               });
             });
           }
        });

        // Ensure at least one tag exists for each category
        const requiredCategories = ['role', 'context', 'output', 'tone', 'thinking'];
        const safeDefaults: Record<string, string> = {
          'role': 'Act as an expert teacher',
          'context': 'For a student learning this topic',
          'output': 'Use clear bullet points',
          'tone': 'Keep it simple and encouraging',
          'thinking': 'Explain the key concepts'
        };

        requiredCategories.forEach(cat => {
          const hasCategory = tags.some(t => t.category === cat);
          if (!hasCategory) {
            tags.push({
              id: `tag-default-${cat}-${idCounter++}`,
              text: safeDefaults[cat],
              category: cat as any,
              selected: false
            });
          }
        });
        
        this._availableTags.set(tags);
        this._selectedTags.set([]); // Reset selection when new tags load
        
        // Update detected meta if provided
        if (response.metadata) {
          this._detectedMeta.set(response.metadata);
        }
        
        // If using fallback, show info message
        if (response.fallback) {
          this._error.set('Using fallback suggestions. API temporarily unavailable.');
        }
      } else {
        this._error.set(response.message || 'Failed to generate tags');
        // Use fallback tags
        this.useFallbackTags();
      }
    } catch (error: any) {
      console.error('Error loading smart tags:', error);
      
      // Use fallback tags on error
      this.useFallbackTags();
      this._error.set('API error. Using fallback suggestions.');
    } finally {
      this._isLoading.set(false);
    }
  }
  
  // Fallback tags for offline/error scenarios
  private useFallbackTags(): void {
    const fallbackTags: TagItem[] = [
      // Role
      { id: 'tag-1', text: 'Act as a patient teacher explaining to a student', category: 'role', selected: false },
      { id: 'tag-2', text: 'Act as a friendly study partner', category: 'role', selected: false },
      { id: 'tag-3', text: 'Act as an expert tutor in this subject', category: 'role', selected: false },
      
      // Context
      { id: 'tag-4', text: 'Student in class 10 studying this topic', category: 'context', selected: false },
      { id: 'tag-5', text: 'Preparing for understanding and exams', category: 'context', selected: false },
      
      // Output (Format)
      { id: 'tag-6', text: 'Use simple bullet points', category: 'output', selected: false },
      { id: 'tag-7', text: 'Provide step-by-step examples', category: 'output', selected: false },
      
      // Tone (Constraints)
      { id: 'tag-8', text: 'Keep explanations short and clear', category: 'tone', selected: false },
      { id: 'tag-9', text: 'Avoid complex jargon', category: 'tone', selected: false },
      
      // Thinking (Task)
      { id: 'tag-10', text: 'Explain the core concepts simply', category: 'thinking', selected: false },
      { id: 'tag-11', text: 'Create a practice quiz with answers', category: 'thinking', selected: false }
    ];
    
    this._availableTags.set(fallbackTags);
  }
  
  // Toggle tag selection (max 5)
  toggleTagSelection(tagId: string): void {
    const availableTags = this._availableTags();
    const selectedTags = this._selectedTags();
    
    const tag = availableTags.find(t => t.id === tagId);
    if (!tag) return;
    
    const isSelected = selectedTags.some(t => t.id === tagId);
    
    if (isSelected) {
      // Deselect
      const updated = availableTags.map(t => 
        t.id === tagId ? { ...t, selected: false } : t
      );
      this._availableTags.set(updated);
      this._selectedTags.set(selectedTags.filter(t => t.id !== tagId));
      
      // Re-detect conflicts after deselection
      this.detectConflicts();
    } else {
      // Select (enforce max 5)
      if (selectedTags.length >= 5) {
        this._error.set('Maximum 5 tags can be selected');
        return;
      }
      
      const updated = availableTags.map(t => 
        t.id === tagId ? { ...t, selected: true } : t
      );
      this._availableTags.set(updated);
      this._selectedTags.set([...selectedTags, { ...tag, selected: true }]);
      this._error.set(null);
      
      // Detect conflicts after selection
      this.detectConflicts();
    }
  }
  
  // Detect conflicts in selected tags
  private detectConflicts(): void {
    const selectedTags = this._selectedTags();
    const warnings: string[] = [];
    
    const tagTexts = selectedTags.map(t => t.text.toLowerCase());
    
    // Define conflict rules
    const conflictRules = [
      {
        keywords: ['short', 'brief', 'concise'],
        conflictsWith: ['detailed', 'comprehensive', 'in-depth', 'thorough'],
        message: 'These tags might conflict. We recommend choosing either short/brief OR detailed/comprehensive.'
      },
      {
        keywords: ['simple', 'basic', 'easy'],
        conflictsWith: ['advanced', 'complex', 'technical'],
        message: 'These tags might conflict. We recommend choosing either simple/easy OR advanced/technical.'
      },
      {
        keywords: ['formal', 'professional'],
        conflictsWith: ['casual', 'friendly', 'conversational'],
        message: 'These tags might conflict. We recommend choosing either formal/professional OR casual/friendly.'
      }
    ];
    
    // Check each rule
    for (const rule of conflictRules) {
      const hasKeyword = tagTexts.some(text => 
        rule.keywords.some(kw => text.includes(kw))
      );
      const hasConflict = tagTexts.some(text => 
        rule.conflictsWith.some(kw => text.includes(kw))
      );
      
      if (hasKeyword && hasConflict) {
        warnings.push(rule.message);
      }
    }
    
    this._conflictWarnings.set(warnings);
  }
  
  // Generate final prompt
  async generatePrompt(): Promise<void> {
    const topic = this._topic();
    const intent = this._intent();
    const selectedTags = this._selectedTags();
    
    if (!topic || !intent) {
      this._error.set('Please provide topic and intent');
      return;
    }
    
    // If no tags selected, use default prompt
    if (selectedTags.length === 0) {
      const defaultPrompt = `Explain "${topic}" like a class teacher, using simple words with short key points that are easy to understand.`;
      this._finalPrompt.set(defaultPrompt);
      this._isDefaultPrompt.set(true);
      return;
    }
    
    // Build prompt from selected tags (client-side)
    this._isDefaultPrompt.set(false);
    
    // Find ROLE tag or use default
    const roleTag = selectedTags.find(t => t.category === 'role');
    const roleInstruction = roleTag 
      ? `Act as: ${roleTag.text}` 
      : 'Act as a friendly school teacher.';
    
    // Build requirements list from all selected tags
    const requirements: string[] = [];
    selectedTags.forEach((tag, index) => {
      requirements.push(`${index + 1}. ${tag.text}`);
    });
    
    // Assemble final prompt
    const finalPrompt = `${roleInstruction}

Topic: "${topic}"

Requirements:
${requirements.join('\n')}

Please provide a clear, student-friendly explanation.`;

    this._finalPrompt.set(finalPrompt);
    
    // Save to recent prompts
    this.saveRecentPrompt(topic, finalPrompt);
    
    // Save as preset after generating a few prompts
    const promptCount = parseInt(localStorage.getItem('betterask_prompt_count') || '0');
    localStorage.setItem('betterask_prompt_count', (promptCount + 1).toString());
    
    if (promptCount >= 2) {
      this.saveAsPreset();
    }
  }
  
  // Reset all state
  reset(): void {
    this._intent.set(null);
    this._topic.set('');
    this._detectedMeta.set(null);
    this._availableTags.set([]);
    this._selectedTags.set([]);
    this._finalPrompt.set('');
    this._isLoading.set(false);
    this._error.set(null);
    this._isDefaultPrompt.set(false);
    this._conflictWarnings.set([]);
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
  
  // Onboarding management
  completeOnboarding(): void {
    localStorage.setItem('betterask_onboarding_complete', 'true');
    this._isOnboardingComplete.set(true);
    this._showOnboarding.set(false);
  }
  
  showOnboardingTutorial(): void {
    this._showOnboarding.set(true);
  }
  
  closeOnboarding(): void {
    this._showOnboarding.set(false);
  }
  
  // Check online status
  private checkOnlineStatus(): void {
    this._isOffline.set(!navigator.onLine);
  }
  
  // Preset management
  saveAsPreset(): void {
    const intent = this._intent();
    const selectedTags = this._selectedTags();
    
    if (intent && selectedTags.length > 0) {
      const preset = {
        intent,
        tagIds: selectedTags.map(t => t.id),
        tags: selectedTags.map(t => ({ text: t.text, category: t.category }))
      };
      localStorage.setItem('betterask_last_preset', JSON.stringify(preset));
    }
  }
  
  loadLastPreset(): boolean {
    const presetData = localStorage.getItem('betterask_last_preset');
    if (!presetData) return false;
    
    try {
      const preset = JSON.parse(presetData);
      this._intent.set(preset.intent);
      
      // We can't restore exact tag IDs, but we can suggest similar setup
      // This is a hint for the user to reselect similar tags
      return true;
    } catch {
      return false;
    }
  }
  
  hasPreset(): boolean {
    return !!localStorage.getItem('betterask_last_preset');
  }
  
  // Recent prompts management
  private loadRecentPrompts(): void {
    const recentsData = sessionStorage.getItem('betterask_recent_prompts');
    if (recentsData) {
      try {
        const recents = JSON.parse(recentsData);
        this._recentPrompts.set(recents);
      } catch {
        this._recentPrompts.set([]);
      }
    }
  }
  
  private saveRecentPrompt(topic: string, prompt: string): void {
    const recents = this._recentPrompts();
    const newRecent = { topic, prompt, timestamp: Date.now() };
    
    // Add to front, keep only last 3
    const updated = [newRecent, ...recents].slice(0, 3);
    this._recentPrompts.set(updated);
    sessionStorage.setItem('betterask_recent_prompts', JSON.stringify(updated));
  }
  
  useRecentPrompt(recent: { topic: string; prompt: string; timestamp: number }): void {
    this._topic.set(recent.topic);
    this._finalPrompt.set(recent.prompt);
    // Note: We can't restore the exact tags that were used
  }
}
