// Direct AWS S3 service for video uploads
// This uses AWS SDK directly for reliable S3 uploads

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { amplifyConfig, awsCredentials } from './amplify-config'

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

class S3StorageService {
  private s3Client: S3Client
  private bucketName: string
  private region: string

  constructor() {
    this.bucketName = amplifyConfig.Storage.AWSS3.bucket
    this.region = amplifyConfig.Storage.AWSS3.region
    
    console.log('🔧 Initializing S3 client with config:', {
      bucket: this.bucketName,
      region: this.region,
      accessKeyId: awsCredentials.accessKeyId.substring(0, 10) + '...',
      secretKeyLength: awsCredentials.secretAccessKey.length
    })
    
    // Initialize S3 client with credentials
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: awsCredentials.accessKeyId,
        secretAccessKey: awsCredentials.secretAccessKey,
      },
    })
    
    console.log('✅ S3 client initialized successfully')
  }

  /**
   * Upload a video file to S3
   */
  async uploadVideo(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('🚀 Starting upload process...')
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })
    console.log('S3 Config:', {
      bucket: this.bucketName,
      region: this.region
    })
    console.log('AWS Credentials:', {
      accessKeyId: awsCredentials.accessKeyId.substring(0, 10) + '...',
      region: awsCredentials.region
    })

    try {
      // Generate unique key for the file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const key = `${timestamp}-${file.name}`
      console.log('Generated S3 key:', key)

      // Convert file to buffer
      console.log('Converting file to buffer...')
      const fileBuffer = await file.arrayBuffer()
      console.log('File buffer size:', fileBuffer.byteLength)
      
      // Upload with progress tracking
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          status: "uploading",
          message: "Starting upload..."
        })
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: new Uint8Array(fileBuffer),
        ContentType: file.type,
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString()
        }
      })

      console.log('S3 Command created:', {
        Bucket: command.input.Bucket,
        Key: command.input.Key,
        ContentType: command.input.ContentType
      })

      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 50,
          status: "uploading",
          message: "Uploading to S3..."
        })
      }

      console.log('Sending command to S3...')
      const result = await this.s3Client.send(command)
      console.log('S3 Upload result:', result)

      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 100,
          status: "completed",
          message: "Upload completed"
        })
      }

      const uploadResult = {
        key: key,
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`,
        bucket: this.bucketName,
        region: this.region
      }

      console.log('✅ Upload successful!', uploadResult)
      return uploadResult
    } catch (error) {
      console.error('❌ Upload error details:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          status: "error",
          message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
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
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'videos/',
        MaxKeys: 1000
      })

      const result = await this.s3Client.send(command)

      return (result.Contents || []).map(item => ({
        name: item.Key?.split('/').pop() || 'Unknown',
        size: item.Size || 0,
        type: 'video/mp4', // Default type
        uploadedAt: item.LastModified?.toISOString() || new Date().toISOString(),
        s3Key: item.Key || '',
        s3Url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${item.Key}`
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
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      await this.s3Client.send(command)
    } catch (error) {
      console.error('Error deleting video:', error)
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Test S3 connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; files?: VideoFile[] }> {
    try {
      const files = await this.listVideos()
      return {
        success: true,
        message: `Connected to S3 bucket '${this.bucketName}' in region '${this.region}'. Found ${files.length} files.`,
        files
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Export singleton instance
export const s3Storage = new S3StorageService()

// Export types for use in components
export type { UploadProgress, UploadResult, VideoFile }
