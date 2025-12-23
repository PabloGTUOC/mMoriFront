import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StretchRepositoryService } from '../services/stretch-repository.service';
import { CommonModule } from "@angular/common";
import { StretchItemComponent } from "../stretch-item/stretch-item.component";

@Component({
  selector: 'app-stretch-repository',
  standalone: true,
  templateUrl: './stretch-repository.component.html',
  styleUrl: './stretch-repository.component.scss',
  imports: [CommonModule, StretchItemComponent, ReactiveFormsModule]
})
export class StretchRepositoryComponent implements OnInit {
  stretches: any[] = [];
  showAddStretchForm = false;
  addStretchForm!: FormGroup;

  constructor(
    private stretchService: StretchRepositoryService,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.fetchStretches();
    this.initializeForm();
  }

  fetchStretches() {
    this.stretchService.getStretches().subscribe({
      next: (response) => {
        console.log('Fetched stretches:', response);
        if (Array.isArray(response)) {
          this.stretches = response;
        } else if (response.success && Array.isArray(response.data)) {
          this.stretches = response.data;
        } else if (response.success && Array.isArray(response.stretches)) {
          this.stretches = response.stretches;
        }
      }, error: (error) => {
        console.error('Error fetching stretches', error);
      },
    });
  }

  initializeForm() {
    this.addStretchForm = this.fb.group({
      stretch_name: ['', Validators.required],
      description: ['', Validators.required],
      video_link: ['', [Validators.required, Validators.pattern('https?://.+')]],
    });
  }

  toggleAddStretchForm() {
    this.showAddStretchForm = !this.showAddStretchForm;
  }

  submitStretch() {
    if (this.addStretchForm.valid) {
      const newStretchData = this.addStretchForm.value;
      this.stretchService.addNewStretch(newStretchData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showAddStretchForm = false;
            this.addStretchForm.reset();
            this.fetchStretches();
          }
        }, error: (error) => {
          console.error('Error adding new stretch:', error);
        },
      });
    }
  }
}
