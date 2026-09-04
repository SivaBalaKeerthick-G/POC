import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DocumentFile {
  id: string;
  name: string;
  size: string;
  category: string;
  chunksCount: number;
  status: 'Indexed' | 'Processing';
  lastUpdated: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  filterQuery = '';

  documents: DocumentFile[] = [
    {
      id: '1',
      name: 'Security_Compliance_2026.pdf',
      size: '2.4 MB',
      category: 'Security & Policy',
      chunksCount: 142,
      status: 'Indexed',
      lastUpdated: 'Sep 02, 2026'
    },
    {
      id: '2',
      name: 'IT_Operations_Guide.pdf',
      size: '4.1 MB',
      category: 'IT Support',
      chunksCount: 210,
      status: 'Indexed',
      lastUpdated: 'Aug 28, 2026'
    },
    {
      id: '3',
      name: 'Q3_API_Specifications.pdf',
      size: '1.8 MB',
      category: 'Engineering',
      chunksCount: 88,
      status: 'Processing',
      lastUpdated: 'Just now'
    }
  ];

  openUploadModal(): void {
    alert('Opening Document Upload & Vector Indexing Dialog...');
  }

  editDoc(doc: DocumentFile): void {
    alert(`Edit metadata for: ${doc.name}`);
  }

  reindexDoc(doc: DocumentFile): void {
    alert(`Triggered vector chunk re-indexing for: ${doc.name}`);
  }

  deleteDoc(id: string): void {
    if (confirm('Are you sure you want to remove this document from the knowledge base?')) {
      this.documents = this.documents.filter(d => d.id !== id);
    }
  }
}