import { Component, inject } from '@angular/core';
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
  searchQuery: string = '';
  isLoading: boolean = false;
  messages: ChatMessage[] = [];
  errorMessage: string | null = null;

  private ragService = inject(RagService);

  selectPrompt(promptText: string): void {
    this.searchQuery = promptText;
    this.onSearch();
  }

  onSearch(): void {
    if (!this.searchQuery.trim() || this.isLoading) return;

    const query = this.searchQuery.trim();

    // Add user query to conversation
    this.messages.push({ role: 'user', content: query });
    this.searchQuery = '';
    this.isLoading = true;
    this.errorMessage = null;

    this.ragService.sendQuery(query).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'ai',
          content: response.content,
          sources: response.sources,
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('RAG query failed:', err);
        this.errorMessage = 'Failed to get a response. Please try again.';
        this.isLoading = false;
      },
    });
  }
}