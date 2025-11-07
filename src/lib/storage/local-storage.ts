/**
 * Local File Storage Provider
 * For development and testing without AWS dependencies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  StorageProvider,
  UploadOptions,
  PresignedUrlResponse,
  StorageMetadata,
} from './storage-service';

export class LocalStorageProvider implements StorageProvider {
  private storageDir: string;
  private baseUrl: string;

  constructor() {
    // Storage directory (relative to project root)
    this.storageDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage', 'evidence');
    this.baseUrl = process.env.LOCAL_STORAGE_URL || 'http://localhost:3000/api/storage';

    // Ensure storage directory exists
    this.ensureStorageDir();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  /**
   * Generate "presigned" URL for local upload
   * In local mode, this returns an API endpoint that handles the upload
   */
  async getPresignedUploadUrl(options: UploadOptions): Promise<PresignedUrlResponse> {
    const { fileName, assessmentId } = options;

    // Generate secure file key
    const fileKey = this.generateFileKey(assessmentId, fileName);

    // Create upload token for security
    const token = this.generateUploadToken(fileKey);

    // Return local upload endpoint with token
    const uploadUrl = `${this.baseUrl}/upload?key=${encodeURIComponent(fileKey)}&token=${token}`;

    return {
      uploadUrl,
      fileKey,
      expiresIn: 15 * 60, // 15 minutes (for consistency with S3)
    };
  }

  /**
   * Generate "presigned" URL for local download
   */
  async getPresignedDownloadUrl(fileKey: string, fileName: string): Promise<string> {
    // Generate download token
    const token = this.generateDownloadToken(fileKey);

    // Return local download endpoint
    return `${this.baseUrl}/download?key=${encodeURIComponent(fileKey)}&token=${token}&filename=${encodeURIComponent(fileName)}`;
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    const filePath = this.getFilePath(fileKey);

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    }
  }

  /**
   * Check if file exists locally
   */
  async fileExists(fileKey: string): Promise<boolean> {
    const filePath = this.getFilePath(fileKey);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata from local storage
   */
  async getFileMetadata(fileKey: string): Promise<StorageMetadata | null> {
    const filePath = this.getFilePath(fileKey);

    try {
      const stats = await fs.stat(filePath);
      const fileBuffer = await fs.readFile(filePath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Try to read metadata file if exists
      const metadataPath = `${filePath}.meta.json`;
      let metadata: any = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch {
        // No metadata file, use defaults
      }

      return {
        fileName: metadata.fileName || fileKey.split('/').pop() || 'unknown',
        fileType: metadata.fileType || 'application/octet-stream',
        fileSize: stats.size,
        storageKey: fileKey,
        storageUrl: `${this.baseUrl}/file/${fileKey}`,
        checksum,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save file to local storage (used by upload API)
   */
  async saveFile(fileKey: string, fileBuffer: Buffer, metadata: any): Promise<void> {
    const filePath = this.getFilePath(fileKey);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    // Save metadata
    const metadataPath = `${filePath}.meta.json`;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Read file from local storage (used by download API)
   */
  async readFile(fileKey: string): Promise<Buffer> {
    const filePath = this.getFilePath(fileKey);
    return await fs.readFile(filePath);
  }

  /**
   * Get absolute file path
   */
  private getFilePath(fileKey: string): string {
    return path.join(this.storageDir, fileKey);
  }

  /**
   * Generate secure file key
   */
  private generateFileKey(assessmentId: string, fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `assessments/${assessmentId}/evidence/${timestamp}-${random}-${sanitizedFileName}`;
  }

  /**
   * Generate upload token for security
   */
  private generateUploadToken(fileKey: string): string {
    const secret = process.env.UPLOAD_TOKEN_SECRET || 'default-secret-change-in-production';
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const payload = `${fileKey}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);

    return `${Buffer.from(payload).toString('base64')}.${hmac.digest('hex')}`;
  }

  /**
   * Verify upload token
   */
  verifyUploadToken(fileKey: string, token: string): boolean {
    try {
      const [payloadBase64, signature] = token.split('.');
      const payload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const [tokenFileKey, expiresAtStr] = payload.split(':');

      // Check if token matches file key
      if (tokenFileKey !== fileKey) {
        return false;
      }

      // Check if token expired
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt) {
        return false;
      }

      // Verify signature
      const secret = process.env.UPLOAD_TOKEN_SECRET || 'default-secret-change-in-production';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  /**
   * Generate download token
   */
  private generateDownloadToken(fileKey: string): string {
    const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'default-secret-change-in-production';
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    const payload = `${fileKey}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);

    return `${Buffer.from(payload).toString('base64')}.${hmac.digest('hex')}`;
  }

  /**
   * Verify download token
   */
  verifyDownloadToken(fileKey: string, token: string): boolean {
    try {
      const [payloadBase64, signature] = token.split('.');
      const payload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const [tokenFileKey, expiresAtStr] = payload.split(':');

      // Check if token matches file key
      if (tokenFileKey !== fileKey) {
        return false;
      }

      // Check if token expired
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt) {
        return false;
      }

      // Verify signature
      const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'default-secret-change-in-production';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
}
