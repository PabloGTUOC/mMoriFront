import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StretchRepositoryService } from '../services/stretch-repository.service';
import { Stretch } from '../models';
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
  stretches: Stretch[] = [];
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
      next: (stretches) => (this.stretches = stretches),
      error: (error) => {
        console.error('Error fetching stretches', error);
      },
    });
  }

  initializeForm() {
    this.addStretchForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      video_link: ['', [Validators.required, Validators.pattern('https?://.+')]],
    });
  }

  toggleAddStretchForm() {
    this.showAddStretchForm = !this.showAddStretchForm;
  }

  submitStretch() {
    if (this.addStretchForm.valid) {
      this.stretchService.addNewStretch(this.addStretchForm.value).subscribe({
        next: () => {
          this.showAddStretchForm = false;
          this.addStretchForm.reset();
          this.fetchStretches();
        },
        error: (error) => {
          console.error('Error adding new stretch:', error);
        },
      });
    }
  }
}
