import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';

interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  profileImage?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  loading = false;
  uploadingImage = false;
  success = '';
  error = '';
  userProfile: UserProfile | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/profile' } });
      return;
    }

    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.apiService.get<any>('user/profile').subscribe({
      next: (data) => {
        console.log('✅ Profile loaded:', data);
        this.userProfile = {
          id: data.id,
          email: data.email,
          fullName: data.name || '',
          profileImage: data.profileImage || null
        };

        this.imagePreview = this.userProfile.profileImage || null;

        this.profileForm.patchValue({
          fullName: this.userProfile.fullName,
          email: this.userProfile.email
        });
        
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading profile:', err);
        this.loading = false;
        this.error = 'Failed to load profile';
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImage(): void {
    if (!this.selectedFile) return;

    this.uploadingImage = true;
    this.error = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Upload using multipart form data
    this.apiService.post('user/profile/upload-image', formData).subscribe({
      next: (response: any) => {
        console.log('✅ Image uploaded:', response);
        this.uploadingImage = false;
        this.success = 'Profile image updated!';
        this.selectedFile = null;
        
        if (this.userProfile && response.profileImage) {
          this.userProfile.profileImage = response.profileImage;
          this.imagePreview = response.profileImage;
        }
        
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err) => {
        console.error('❌ Upload error:', err);
        this.uploadingImage = false;
        this.error = err.error?.error || 'Failed to upload image';
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges(); // Force update before request

    const updateData: any = {
      name: this.profileForm.get('fullName')?.value
    };

    console.log('🔄 Updating profile:', updateData);

    this.apiService.put('user/profile', updateData).subscribe({
      next: (response: any) => {
        console.log('✅ Profile updated:', response);
        this.success = 'Profile updated successfully!';
        
        if (this.userProfile) {
          this.userProfile.fullName = updateData.name;
        }
        
        setTimeout(() => {
          this.success = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.error = 'Failed to update profile';
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('✅ Observable completed');
        this.loading = false;
        console.log('Loading set to false in complete handler');
        this.cdr.detectChanges(); // Force Angular to check for changes
      }
    });
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = this.userProfile?.profileImage || null;
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}