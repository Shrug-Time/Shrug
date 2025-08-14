import { useState, useRef, useCallback } from 'react';
import { ImageUploadService } from '@/services/imageUpload';
import Image from 'next/image';

interface ImageUploadProps {
  onImagesChange: (imageUrls: string[]) => void;
  userId: string;
  postId?: string;
  maxImages?: number;
  existingImages?: string[];
  disabled?: boolean;
}

interface ImagePreview {
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploaded: boolean;
  downloadUrl?: string;
  error?: string;
}

export function ImageUpload({ 
  onImagesChange, 
  userId, 
  postId, 
  maxImages = 5, 
  existingImages = [],
  disabled = false 
}: ImageUploadProps) {
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const totalImages = imagePreviews.length + existingImages.length + fileArray.length;
    
    if (totalImages > maxImages) {
      alert(`You can only upload a maximum of ${maxImages} images`);
      return;
    }

    // Create previews for new files
    const newPreviews: ImagePreview[] = fileArray.map(file => ({
      file,
      previewUrl: ImageUploadService.createFilePreview(file),
      uploading: false,
      uploaded: false
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);

    // Upload files one by one
    for (let i = 0; i < newPreviews.length; i++) {
      const preview = newPreviews[i];
      const previewIndex = imagePreviews.length + i;

      // Update uploading state
      setImagePreviews(prev => 
        prev.map((p, idx) => 
          idx === previewIndex ? { ...p, uploading: true, error: undefined } : p
        )
      );

      try {
        const downloadUrl = await ImageUploadService.uploadImage(preview.file, userId, postId);
        
        // Update uploaded state
        setImagePreviews(prev => 
          prev.map((p, idx) => 
            idx === previewIndex 
              ? { ...p, uploading: false, uploaded: true, downloadUrl }
              : p
          )
        );

        // Update parent component with all uploaded URLs
        const allUrls = [
          ...existingImages,
          ...imagePreviews.slice(0, previewIndex).filter(p => p.uploaded).map(p => p.downloadUrl!),
          downloadUrl,
          ...imagePreviews.slice(previewIndex + 1).filter(p => p.uploaded).map(p => p.downloadUrl!)
        ];
        onImagesChange(allUrls);

      } catch (error) {
        // Update error state
        setImagePreviews(prev => 
          prev.map((p, idx) => 
            idx === previewIndex 
              ? { ...p, uploading: false, error: error instanceof Error ? error.message : 'Upload failed' }
              : p
          )
        );
      }
    }
  }, [imagePreviews, existingImages, maxImages, userId, postId, onImagesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  const removeImage = useCallback((index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // Remove from existing images
      const newExistingImages = existingImages.filter((_, i) => i !== index);
      const allUrls = [
        ...newExistingImages,
        ...imagePreviews.filter(p => p.uploaded).map(p => p.downloadUrl!)
      ];
      onImagesChange(allUrls);
    } else {
      // Remove from preview images
      setImagePreviews(prev => {
        const newPreviews = prev.filter((_, i) => i !== index);
        // Revoke preview URL to free memory
        ImageUploadService.revokeFilePreview(prev[index].previewUrl);
        
        // Update parent with remaining uploaded URLs
        const allUrls = [
          ...existingImages,
          ...newPreviews.filter(p => p.uploaded).map(p => p.downloadUrl!)
        ];
        onImagesChange(allUrls);
        
        return newPreviews;
      });
    }
  }, [imagePreviews, existingImages, onImagesChange]);

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP up to 5MB</p>
            <p className="text-xs text-gray-500">Maximum {maxImages} images</p>
          </div>
        </div>
      </div>

      {/* Image Previews */}
      {(existingImages.length > 0 || imagePreviews.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Existing Images */}
          {existingImages.map((imageUrl, index) => (
            <div key={`existing-${index}`} className="relative group">
              <div className="aspect-square relative rounded-lg overflow-hidden border">
                <Image
                  src={imageUrl}
                  alt={`Uploaded image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              {!disabled && (
                <button
                  onClick={() => removeImage(index, true)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/* Preview Images */}
          {imagePreviews.map((preview, index) => (
            <div key={`preview-${index}`} className="relative group">
              <div className="aspect-square relative rounded-lg overflow-hidden border">
                <Image
                  src={preview.previewUrl}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                />
                
                {/* Upload States */}
                {preview.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {preview.uploaded && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
                      ✓
                    </div>
                  </div>
                )}
              </div>
              
              {/* Error State */}
              {preview.error && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center rounded-lg">
                  <p className="text-white text-xs text-center p-2">{preview.error}</p>
                </div>
              )}
              
              {!disabled && (
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}