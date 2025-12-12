import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartTagService } from '../../services/smart-tag.service';
import { Intent, TagCategory } from '../../models/smart-tag.model';

@Component({
  selector: 'app-smart-tag-builder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-tag-builder.component.html',
  styleUrls: ['./smart-tag-builder.component.css']
})
export class SmartTagBuilderComponent {
  // Intent options with display labels
  intentOptions: { value: Intent; label: string }[] = [
    { value: 'learn', label: 'Learn' },
    { value: 'test', label: 'Prepare for Test' },
    { value: 'revise', label: 'Revise' },
    { value: 'doubt', label: 'Clear Doubt' }
  ];

  constructor(public tagService: SmartTagService) {}

  // Intent selection
  selectIntent(intent: Intent) {
    this.tagService.setIntent(intent);
  }

  // Topic input with auto-detection and debounced loading
  onTopicInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.tagService.setTopic(target.value);
  }

  // Tag selection toggle
  toggleTag(tagId: string) {
    this.tagService.toggleTagSelection(tagId);
  }

  // Check if tag is selected
  isTagSelected(tagId: string): boolean {
    return this.tagService.selectedTags().some(t => t.id === tagId);
  }

  // Get tags by category
  getTagsByCategory(category: TagCategory) {
    return this.tagService.availableTags().filter(t => t.category === category);
  }

  // Generate final prompt
  async generateFinalPrompt() {
    await this.tagService.generatePrompt();
  }

  // Copy prompt to clipboard
  async copyPrompt() {
    const prompt = this.tagService.finalPrompt();
    if (prompt) {
      try {
        await navigator.clipboard.writeText(prompt);
        alert('Prompt copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }

  // Share on WhatsApp
  shareOnWhatsApp() {
    const prompt = this.tagService.finalPrompt();
    if (prompt) {
      const encodedPrompt = encodeURIComponent(prompt);
      window.open(`https://wa.me/?text=${encodedPrompt}`, '_blank');
    }
  }

  // Reset all
  reset() {
    this.tagService.reset();
    this.generatedPrompt.set(prompt);
  }

  copyPrompt() {
    navigator.clipboard.writeText(this.generatedPrompt());
  }

  shareToWhatsApp() {
    const text = encodeURIComponent(this.generatedPrompt());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  reset() {
    this.selectedIntent.set(null);
    this.topic.set('');
    this.availableTags.set([]);
    this.selectedTags.set([]);
    this.generatedPrompt.set('');
    this.error.set('');
  }
}
