import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../models/chat.model';

export interface QueryRequest {
  query: string;
}

@Injectable({
  providedIn: 'root',
})
export class RagService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Sends a user query to the RAG backend and returns an AI ChatMessage
   * with grounded answer text and source citations.
   */
  sendQuery(query: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/api/chat/query`, {
      query,
    } satisfies QueryRequest);
  }
}
