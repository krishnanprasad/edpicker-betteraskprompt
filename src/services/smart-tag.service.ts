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
  
  // Public readonly signals
  readonly intent = this._intent.asReadonly();
  readonly topic = this._topic.asReadonly();
  readonly detectedMeta = this._detectedMeta.asReadonly();
  readonly availableTags = this._availableTags.asReadonly();
  readonly selectedTags = this._selectedTags.asReadonly();
  readonly finalPrompt = this._finalPrompt.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed signals
  readonly canGeneratePrompt = computed(() => 
    this._intent() !== null && 
    this._topic().length >= 4 && 
    this._selectedTags().length > 0
  );
  
  readonly selectedCount = computed(() => this._selectedTags().length);
  readonly canSelectMore = computed(() => this._selectedTags().length < 5);
  
  // Debounce timer
  private debounceTimer: any = null;
  
  constructor(private http: HttpClient) {}
  
  // Set intent
  setIntent(intent: Intent): void {
    this._intent.set(intent);
    this._error.set(null);
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
    
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      const endpoint = `${environment.apiBase}/gemini/tags/generate`;
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
        
        (['role', 'context', 'output', 'tone', 'thinking'] as const).forEach(category => {
          const categoryTags = response.tags[category] || [];
          categoryTags.forEach((text: string) => {
            tags.push({
              id: `tag-${idCounter++}`,
              text,
              category,
              selected: false
            });
          });
        });
        
        this._availableTags.set(tags);
        this._selectedTags.set([]); // Reset selection when new tags load
        
        // Update detected meta if provided
        if (response.metadata) {
          this._detectedMeta.set(response.metadata);
        }
      } else {
        this._error.set(response.message || 'Failed to generate tags');
      }
    } catch (error: any) {
      this._error.set(error.message || 'Failed to load smart tags');
      console.error('Error loading smart tags:', error);
    } finally {
      this._isLoading.set(false);
    }
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
    }
  }
  
  // Generate final prompt
  async generatePrompt(): Promise<void> {
    const topic = this._topic();
    const intent = this._intent();
    const selectedTags = this._selectedTags();
    
    if (!topic || !intent || selectedTags.length === 0) {
      this._error.set('Please provide topic, intent, and select at least one tag');
      return;
    }
    
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      const endpoint = `${environment.apiBase}/gemini/prompt/generate`;
      const request: PromptRequest = {
        topic,
        intent,
        selectedTags: selectedTags.map(t => ({ text: t.text, category: t.category }))
      };
      
      const response$ = this.http.post<{ success: boolean; prompt?: string; message?: string }>(
        endpoint, 
        request
      );
      
      const response = await firstValueFrom(response$);
      
      if (response.success && response.prompt) {
        this._finalPrompt.set(response.prompt);
      } else {
        this._error.set(response.message || 'Failed to generate prompt');
      }
    } catch (error: any) {
      this._error.set(error.message || 'Failed to generate prompt');
      console.error('Error generating prompt:', error);
    } finally {
      this._isLoading.set(false);
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
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
