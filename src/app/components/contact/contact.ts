import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {
  isSubmitting = false;

  formData = {
    name: '',
    email: '',
    category: 'access',
    message: ''
  };

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    // Simulate API submission
    setTimeout(() => {
      alert('Thank you! Your support ticket has been submitted successfully.');
      this.formData = {
        name: '',
        email: '',
        category: 'access',
        message: ''
      };
      this.isSubmitting = false;
    }, 1200);
  }
}