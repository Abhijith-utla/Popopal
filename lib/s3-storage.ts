// Direct AWS S3 service for video uploads
// This uses AWS SDK directly for reliable S3 uploads

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
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
    this.bucketName = amplifyConfig.Storage.S3.bucket
    this.region = amplifyConfig.Storage.S3.region
    
    // Get credentials from environment variables (NEXT_PUBLIC_ prefixed for browser access)
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
    
    console.log('🔧 Initializing S3 client...')
    console.log('📍 Region:', this.region)
    console.log('🪣 Bucket:', this.bucketName)
    console.log('🔑 Access Key ID:', accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'Not set')
    console.log('🔐 Secret Access Key:', secretAccessKey ? 'Set' : 'Not set')
    
    // Initialize S3 client with credentials
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    })
  }

  /**
   * Upload a video file to S3 using AWS SDK directly
   */
  async uploadVideo(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Generate unique key for the file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const key = `videos/${timestamp}-${file.name}`

      console.log(`🚀 Uploading ${file.name} to S3 bucket: ${this.bucketName}`)
      console.log(`📍 Region: ${this.region}`)
      console.log(`🔑 Key: ${key}`)
      console.log(`📊 File size: ${file.size} bytes`)
      console.log(`🎬 File type: ${file.type}`)

      // Validate credentials
      const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID
      const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
      
      if (!accessKeyId || accessKeyId === 'YOUR_ACCESS_KEY_HERE') {
        throw new Error('AWS_ACCESS_KEY_ID is not configured properly in environment variables')
      }
      
      if (!secretAccessKey || secretAccessKey === 'YOUR_SECRET_KEY_HERE') {
        throw new Error('AWS_SECRET_ACCESS_KEY is not configured properly in environment variables')
      }

      // Convert file to buffer
      const fileBuffer = await file.arrayBuffer()
      console.log(`📦 File buffer size: ${fileBuffer.byteLength} bytes`)
      
      // Create upload command
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

      console.log(`📤 Sending upload command to S3...`)
      
      // Upload to S3
      const result = await this.s3Client.send(command)
      
      console.log(`✅ Upload successful for ${file.name}:`, result)

      // Simulate progress for UI
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 100,
          status: "completed",
          message: "Upload completed"
        })
      }

      return {
        key: key,
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`,
        bucket: this.bucketName,
        region: this.region
      }
    } catch (error) {
      console.error('❌ Upload error details:', error)
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
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
        MaxKeys: 100
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
   * Download a video (if needed)
   */
  async downloadVideo(key: string): Promise<Blob> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      const result = await this.s3Client.send(command)
      
      if (!result.Body) {
        throw new Error('No body in response')
      }

      return await result.Body.transformToByteArray().then(bytes => new Blob([bytes]))
    } catch (error) {
      console.error('Error downloading video:', error)
      throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const s3Storage = new S3StorageService()

// Export types for use in components
export type { UploadProgress, UploadResult, VideoFile }