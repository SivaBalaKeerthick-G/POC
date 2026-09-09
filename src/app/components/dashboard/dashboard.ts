import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DocumentFile {
  id: string;
  name: string;
  size: string;
  category: string;
  chunksCount: number;
  status: 'Indexed' | 'Processing';
  lastUpdated: string;
}

export interface VectorChunk {
  id: string;
  chunkIndex: number;
  score: string;
  tokens: number;
  textExcerpt: string;
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
  selectedDocForDrawer: DocumentFile | null = null;
  
  // Notification Toast State
  notificationMessage: string | null = null;

  // Inline Upload Modal State
  isUploadModalOpen = false;
  selectedFile: File | null = null;
  selectedCategory = 'Security & Policy';
  isDragging = false;

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

  mockChunks: VectorChunk[] = [
    {
      id: 'c1',
      chunkIndex: 1,
      score: '0.942',
      tokens: 184,
      textExcerpt: 'Operational logs are retained in primary hot storage for 90 days. Encrypted backups transition to Glacier cold storage for 3 years.'
    },
    {
      id: 'c2',
      chunkIndex: 2,
      score: '0.887',
      tokens: 210,
      textExcerpt: 'Access control permissions require quarterly review by team leads. Inactive accounts are flagged after 45 days of zero login events.'
    }
  ];

  // Toast Notification Helper (Set to auto-dismiss in 2000ms / 2 seconds)
  showNotification(msg: string): void {
    this.notificationMessage = msg;
    setTimeout(() => {
      this.notificationMessage = null;
    }, 2000);
  }

  // Upload Modal Handlers
  openUploadModal(): void {
    this.selectedFile = null;
    this.isUploadModalOpen = true;
  }

  closeUploadModal(): void {
    this.isUploadModalOpen = false;
  }

  // Drag & Drop Handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      this.handleFile(target.files[0]);
    }
  }

  private handleFile(file: File): void {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      this.showNotification('Error: Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    this.selectedFile = file;
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Direct Upload without progress bar / loading delay
  startUpload(): void {
    if (!this.selectedFile) return;

    const newDoc: DocumentFile = {
      id: Date.now().toString(),
      name: this.selectedFile.name,
      size: this.formatFileSize(this.selectedFile.size),
      category: this.selectedCategory,
      chunksCount: Math.floor(Math.random() * 120) + 30,
      status: 'Indexed',
      lastUpdated: 'Just now'
    };

    // Prepend new document directly to table
    this.documents.unshift(newDoc);
    this.isUploadModalOpen = false;

    // Show instant success notification for 2 seconds
    this.showNotification(`Document "${newDoc.name}" uploaded successfully!`);
  }

  // Chunk Drawer Handlers
  openChunkDrawer(doc: DocumentFile): void {
    this.selectedDocForDrawer = doc;
  }

  closeChunkDrawer(): void {
    this.selectedDocForDrawer = null;
  }

  copyChunk(text: string): void {
    navigator.clipboard.writeText(text);
    this.showNotification('Chunk excerpt copied to clipboard!');
  }

  // Admin Table Actions
  editDoc(doc: DocumentFile): void {
    this.showNotification(`Editing metadata for: ${doc.name}`);
  }

  reindexDoc(doc: DocumentFile): void {
    this.showNotification(`Re-indexing vector chunks for ${doc.name}...`);
  }

  deleteDoc(id: string): void {
    const docToDelete = this.documents.find(d => d.id === id);
    if (confirm('Are you sure you want to remove this document from the knowledge base?')) {
      this.documents = this.documents.filter(d => d.id !== id);
      if (docToDelete) {
        this.showNotification(`Removed "${docToDelete.name}" from knowledge base.`);
      }
    }
  }
}