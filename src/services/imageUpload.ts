import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export class ImageUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  /**
   * Validates an image file
   */
  static validateImage(file: File): string | null {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      return 'Image file size must be less than 5MB';
    }
    
    return null;
  }
  
  /**
   * Uploads an image to Firebase Storage
   */
  static async uploadImage(file: File, userId: string, postId?: string): Promise<string> {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }
    
    const validationError = this.validateImage(file);
    if (validationError) {
      throw new Error(validationError);
    }
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Create storage path  
    const storagePath = postId 
      ? `posts/${postId}/images/${fileName}`
      : `avatars/${userId}/${fileName}`;
    
    const storageRef = ref(storage, storagePath);
    
    try {
      console.log('Uploading to path:', storagePath);
      
      // Upload the file with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: Date.now().toString()
        }
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      console.log('Upload successful, getting download URL...');
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('cors')) {
          throw new Error('Upload failed due to CORS policy. Please try again or contact support.');
        }
        if (error.message.includes('unauthorized')) {
          throw new Error('You are not authorized to upload files. Please sign in again.');
        }
        if (error.message.includes('network')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
      }
      
      throw new Error('Failed to upload image. Please try again.');
    }
  }
  
  /**
   * Uploads multiple images
   */
  static async uploadImages(files: File[], userId: string, postId?: string): Promise<string[]> {
    if (files.length > 5) {
      throw new Error('You can upload a maximum of 5 images');
    }
    
    const uploadPromises = files.map(file => this.uploadImage(file, userId, postId));
    
    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  }
  
  /**
   * Deletes an image from Firebase Storage
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }
    
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw error for deletion failures as they might not be critical
    }
  }
  
  /**
   * Creates a preview URL for a file
   */
  static createFilePreview(file: File): string {
    return URL.createObjectURL(file);
  }
  
  /**
   * Revokes a preview URL to free up memory
   */
  static revokeFilePreview(url: string): void {
    URL.revokeObjectURL(url);
  }
}