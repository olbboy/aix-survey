/**
 * AWS S3 Storage Provider
 * Production-grade implementation with presigned URLs
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  StorageProvider,
  UploadOptions,
  PresignedUrlResponse,
  StorageMetadata,
} from './storage-service';

export class S3StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    // Validate required environment variables
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is required for S3 storage');
    }

    this.bucket = bucket;
    this.region = region;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Generate presigned URL for client-side upload
   */
  async getPresignedUploadUrl(options: UploadOptions): Promise<PresignedUrlResponse> {
    const { fileName, fileType, assessmentId } = options;

    // Generate secure file key
    const fileKey = this.generateFileKey(assessmentId, fileName);

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        assessmentId,
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate presigned URL (expires in 15 minutes)
    const expiresIn = 15 * 60; // 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl,
      fileKey,
      expiresIn,
    };
  }

  /**
   * Generate presigned URL for client-side download
   */
  async getPresignedDownloadUrl(fileKey: string, fileName: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    });

    // Generate presigned URL (expires in 1 hour)
    const expiresIn = 60 * 60; // 1 hour
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    await this.s3Client.send(command);
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(fileKey: string): Promise<StorageMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);

      return {
        fileName: response.Metadata?.originalName || fileKey.split('/').pop() || 'unknown',
        fileType: response.ContentType || 'application/octet-stream',
        fileSize: response.ContentLength || 0,
        storageKey: fileKey,
        storageUrl: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`,
        checksum: response.ETag?.replace(/"/g, ''),
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
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
}
