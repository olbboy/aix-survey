/**
 * Storage Service Abstraction
 * Supports both S3 and local file storage with seamless switching
 */

export interface UploadOptions {
  fileName: string;
  fileType: string;
  fileSize: number;
  assessmentId: string;
  itemCode?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number; // seconds
}

export interface StorageMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  storageUrl: string;
  checksum?: string;
}

/**
 * Storage interface for file operations
 */
export interface StorageProvider {
  /**
   * Generate presigned URL for client-side upload
   */
  getPresignedUploadUrl(options: UploadOptions): Promise<PresignedUrlResponse>;

  /**
   * Generate presigned URL for client-side download
   */
  getPresignedDownloadUrl(fileKey: string, fileName: string): Promise<string>;

  /**
   * Delete file from storage
   */
  deleteFile(fileKey: string): Promise<void>;

  /**
   * Check if file exists
   */
  fileExists(fileKey: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getFileMetadata(fileKey: string): Promise<StorageMetadata | null>;
}

/**
 * Factory function to get the appropriate storage provider
 */
export function getStorageProvider(): StorageProvider {
  const storageType = process.env.STORAGE_TYPE || 'local';

  switch (storageType) {
    case 's3':
      // Lazy load S3 provider to avoid AWS SDK initialization if not needed
      const { S3StorageProvider } = require('./s3-storage');
      return new S3StorageProvider();

    case 'local':
    default:
      const { LocalStorageProvider } = require('./local-storage');
      return new LocalStorageProvider();
  }
}

/**
 * Singleton instance
 */
let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = getStorageProvider();
  }
  return storageInstance;
}

/**
 * Validate file type and size
 */
export function validateFile(
  fileName: string,
  fileType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
  ];

  // Check file type
  if (!allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: `File type ${fileType} is not allowed. Allowed types: PDF, Word, Excel, Images, Text`,
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes (10MB)`,
    };
  }

  // Check file extension matches MIME type
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypeToExt: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'text/plain': ['txt'],
  };

  const validExts = mimeTypeToExt[fileType];
  if (validExts && ext && !validExts.includes(ext)) {
    return {
      valid: false,
      error: `File extension .${ext} does not match MIME type ${fileType}`,
    };
  }

  return { valid: true };
}

/**
 * Generate secure file key for storage
 */
export function generateFileKey(assessmentId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `assessments/${assessmentId}/evidence/${timestamp}-${random}-${sanitizedFileName}`;
}

/**
 * Calculate file checksum (SHA-256)
 */
export async function calculateChecksum(file: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(file).digest('hex');
}
