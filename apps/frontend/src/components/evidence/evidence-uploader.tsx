'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, File, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';

interface Evidence {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  description?: string;
  itemCode?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  evidenceId?: string;
}

interface EvidenceUploaderProps {
  assessmentId: string;
  itemCode?: string;
  existingEvidence?: Evidence[];
  onUploadComplete?: (evidence: Evidence) => void;
  onDeleteComplete?: (evidenceId: string) => void;
}

export function EvidenceUploader({
  assessmentId,
  itemCode,
  existingEvidence = [],
  onUploadComplete,
  onDeleteComplete,
}: EvidenceUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const [evidence, setEvidence] = useState<Evidence[]>(existingEvidence);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      uploadFile(file);
    });
  };

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;

    // Add to uploading files
    setUploadingFiles((prev) => {
      const next = new Map(prev);
      next.set(fileId, {
        file,
        progress: 0,
        status: 'uploading',
      });
      return next;
    });

    try {
      // Step 1: Get presigned URL
      const urlResponse = await fetch(`/api/assessments/${assessmentId}/evidence/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          itemCode,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = await urlResponse.json();

      // Step 2: Upload file to S3 or local storage
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            const current = next.get(fileId);
            if (current) {
              next.set(fileId, { ...current, progress });
            }
            return next;
          });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Step 3: Confirm upload
          try {
            const confirmResponse = await fetch(
              `/api/assessments/${assessmentId}/evidence/confirm`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileKey,
                  fileName: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                  itemCode,
                }),
              }
            );

            if (!confirmResponse.ok) {
              throw new Error('Failed to confirm upload');
            }

            const { evidence: newEvidence } = await confirmResponse.json();

            // Update state
            setUploadingFiles((prev) => {
              const next = new Map(prev);
              next.set(fileId, {
                file,
                progress: 100,
                status: 'success',
                evidenceId: newEvidence.id,
              });
              return next;
            });

            setEvidence((prev) => [...prev, newEvidence]);

            if (onUploadComplete) {
              onUploadComplete(newEvidence);
            }

            // Remove from uploading after 2 seconds
            setTimeout(() => {
              setUploadingFiles((prev) => {
                const next = new Map(prev);
                next.delete(fileId);
                return next;
              });
            }, 2000);
          } catch (confirmError) {
            throw confirmError;
          }
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadingFiles((prev) => {
          const next = new Map(prev);
          next.set(fileId, {
            file,
            progress: 0,
            status: 'error',
            error: 'Network error during upload',
          });
          return next;
        });
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingFiles((prev) => {
        const next = new Map(prev);
        next.set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        });
        return next;
      });
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/evidence/${evidenceId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete evidence');
      }

      setEvidence((prev) => prev.filter((e) => e.id !== evidenceId));

      if (onDeleteComplete) {
        onDeleteComplete(evidenceId);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete evidence. Please try again.');
    }
  };

  const handleDownload = async (evidenceId: string) => {
    try {
      window.open(
        `/api/assessments/${assessmentId}/evidence/${evidenceId}/download`,
        '_blank'
      );
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download evidence. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
      >
        <CardContent className="pt-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Supported: PDF, Word, Excel, Images (max 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploadingFiles.values()).map((item, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  {item.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    {item.status === 'uploading' && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.progress}%</p>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 flex-shrink-0">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Existing Evidence */}
      {evidence.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Evidence</h4>
          {evidence.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.fileSize)} •{' '}
                      {new Date(item.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(item.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
