import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../models/chat.model';
import { RagService } from '../../core/services/rag.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  searchQuery = signal('');
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  errorMessage = signal<string | null>(null);

  private ragService = inject(RagService);

  selectPrompt(promptText: string): void {
    this.searchQuery.set(promptText);
    this.onSearch();
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (!query || this.isLoading()) return;

    // Add user query to conversation
    this.messages.update((msgs) => [...msgs, { role: 'user', content: query }]);
    this.searchQuery.set('');
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.ragService.sendQuery(query).subscribe({
      next: (response) => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'ai',
            content: response.content,
            sources: response.sources,
          },
        ]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('RAG query failed:', err);
        this.errorMessage.set('Failed to get a response. Please try again.');
        this.isLoading.set(false);
      },
    });
  }
}