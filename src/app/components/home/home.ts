import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SourceChunk {
  id: string;
  fileName: string;
  chunkLocation: string;
  score: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  sources?: SourceChunk[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  searchQuery: string = '';
  isLoading: boolean = false;
  messages: ChatMessage[] = [];

  selectPrompt(promptText: string): void {
    this.searchQuery = promptText;
    this.onSearch();
  }

  onSearch(): void {
    if (!this.searchQuery.trim() || this.isLoading) return;

    const query = this.searchQuery;
    
    // Add user query to conversation
    this.messages.push({
      role: 'user',
      content: query
    });

    this.searchQuery = '';
    this.isLoading = true;

    // Simulate backend RAG retrieval & AI generation
    // Replace this setTimeout with your actual API service call
    setTimeout(() => {
      this.messages.push({
        role: 'ai',
        content: `Based on your request regarding "${query}", operational user logs must be retained for 90 days in primary storage and archived for 3 years in cold storage. Automatic purging runs monthly unless a legal hold flag is activated.`,
        sources: [
          { id: '1', fileName: 'Security_Compliance_2026.pdf', chunkLocation: 'Page 14', score: '96%' },
          { id: '2', fileName: 'IT_Operations_Guide.pdf', chunkLocation: 'Section 3.2', score: '91%' }
        ]
      });

      this.isLoading = false;
    }, 1500);
  }
}