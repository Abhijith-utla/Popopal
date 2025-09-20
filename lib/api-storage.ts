// API-based storage service that bypasses CORS issues
// This uploads files through our Next.js API route instead of directly to S3

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

class ApiStorageService {
  /**
   * Upload a video file via API route (bypasses CORS)
   */
  async uploadVideo(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      console.log(`🚀 Uploading ${file.name} via API route...`)
      console.log(`📊 File size: ${file.size} bytes`)
      console.log(`🎬 File type: ${file.type}`)

      // Quick progress start
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 5,
          status: "uploading",
          message: "Starting upload..."
        })
      }

      // Create form data efficiently
      const formData = new FormData()
      formData.append('file', file)

      console.log(`🌐 Fast upload to /api/upload for ${file.name}`)
      
      // Upload via API route with shorter timeout for faster feedback
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const startTime = Date.now()
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      const uploadTime = Date.now() - startTime
      
      clearTimeout(timeoutId)
      
      console.log(`📡 Fast response received for ${file.name} in ${uploadTime}ms:`, response.status, response.statusText)

      if (!response.ok) {
        console.error(`❌ Upload failed for ${file.name}:`, response.status, response.statusText)
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('Could not parse error response:', e)
        }
        throw new Error(errorMessage)
      }

      console.log(`📊 Parsing response for ${file.name}...`)
      const result = await response.json()
      console.log(`✅ Fast upload successful for ${file.name} in ${uploadTime}ms:`, result)

      // Complete progress quickly
      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 100,
          status: "completed",
          message: `Upload completed in ${uploadTime}ms`
        })
      }

      return result

    } catch (error) {
      console.error('❌ Upload error details:', error)
      
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
}

// Export singleton instance
export const apiStorage = new ApiStorageService()

// Export types for use in components
export type { UploadProgress, UploadResult, VideoFile }
