// Direct AWS S3 service for video uploads
// This uses AWS SDK directly for reliable S3 uploads

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { uploadData, list, remove, downloadData } from 'aws-amplify/storage'
import { amplifyConfig, awsCredentials } from './amplify-config'
import './amplify' // Initialize Amplify configuration

export interface UploadProgress {
  fileName: string
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  message?: string
}

export interface UploadResult {
  key: string
  url: string
  bucket: string
  region: string
}

export interface VideoFile {
  name: string
  size: number
  type: string
  uploadedAt: string
  s3Key: string
  s3Url: string
  analysisResults?: {
    confidence: number
    incidents: Array<{
      type: string
      severity: "low" | "medium" | "high"
      timestamp: string
      confidence: number
      description: string
    }>
    metadata: {
      duration: string
      location: string
      weather: string
      timeOfDay: string
    }
  }
}

class AmplifyStorageService {
  private bucketName: string
  private region: string

  constructor() {
    this.bucketName = amplifyConfig.Storage.S3.bucket
    this.region = amplifyConfig.Storage.S3.region
  }

  /**
   * Upload a video file to S3 using Amplify Storage
   */
  async uploadVideo(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Generate unique key for the file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const key = `${timestamp}-${file.name}`

      // Upload with progress tracking
      const result = await uploadData({
        path: key,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes && onProgress) {
              const progress = Math.round((transferredBytes / totalBytes) * 100)
              onProgress({
                fileName: file.name,
                progress,
                status: progress >= 100 ? "completed" : "uploading",
                message: progress >= 100 ? "Upload completed" : `Uploading... ${progress}%`
              })
            }
          },
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: file.size.toString()
          }
        }
      }).result

      return {
        key: key,
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`,
        bucket: this.bucketName,
        region: this.region
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload multiple video files
   */
  async uploadMultipleVideos(
    files: File[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<VideoFile[]> {
    const results: VideoFile[] = []

    for (const file of files) {
      try {
        const uploadResult = await this.uploadVideo(file, onProgress)
        
        const videoFile: VideoFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          s3Key: uploadResult.key,
          s3Url: uploadResult.url,
          // Mock analysis results for now - you can integrate with Rekognition later
          analysisResults: {
            confidence: Math.floor(Math.random() * 20) + 80,
            incidents: [
              {
                type: "Speed Violation",
                severity: "high",
                timestamp: "02:15",
                confidence: 92,
                description: "Vehicle exceeded speed limit by 15 mph in a 35 mph zone"
              }
            ],
            metadata: {
              duration: "00:15:32",
              location: "Highway 101, Mile Marker 45",
              weather: "Clear",
              timeOfDay: "Afternoon"
            }
          }
        }

        results.push(videoFile)
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        // Continue with other files even if one fails
      }
    }

    return results
  }

  /**
   * List all uploaded videos
   */
  async listVideos(): Promise<VideoFile[]> {
    try {
      const result = await list({
        path: 'videos/',
        options: {
          listAll: true
        }
      })

      return result.items.map(item => ({
        name: item.path.split('/').pop() || 'Unknown',
        size: item.size || 0,
        type: 'video/mp4', // Default type
        uploadedAt: item.lastModified?.toISOString() || new Date().toISOString(),
        s3Key: item.path,
        s3Url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${item.path}`
      }))
    } catch (error) {
      console.error('Error listing videos:', error)
      return []
    }
  }

  /**
   * Delete a video from S3
   */
  async deleteVideo(key: string): Promise<void> {
    try {
      await remove({ path: key })
    } catch (error) {
      console.error('Error deleting video:', error)
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Download a video (if needed)
   */
  async downloadVideo(key: string): Promise<Blob> {
    try {
      const result = await downloadData({ path: key })
      return result as unknown as Blob
    } catch (error) {
      console.error('Error downloading video:', error)
      throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const amplifyStorage = new AmplifyStorageService()

// Export types for use in components
export type { UploadProgress as AmplifyUploadProgress, UploadResult as AmplifyUploadResult, VideoFile as AmplifyVideoFile }
