// AWS S3 Report Service for monitoring output bucket and downloading reports
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { amplifyConfig, awsCredentials } from './amplify-config'

export interface ProcessingStatus {
  status: "processing" | "completed" | "error"
  progress: number
  message: string
  reportUrl?: string
  error?: string
}

class ReportService {
  private s3Client: S3Client
  private outputBucket: string
  private region: string
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor() {
    this.outputBucket = 'popopal-outputs'
    this.region = 'us-east-1'
    
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: awsCredentials.accessKeyId,
        secretAccessKey: awsCredentials.secretAccessKey,
      }
    })
  }

  /**
   * Check for existing reports via API route (bypasses CORS)
   */
  async checkExistingReports(inputS3Key: string): Promise<string[]> {
    try {
      console.log(`🔍 API: Checking for existing reports for: ${inputS3Key}`)
      
      // Extract upload timestamp from input key
      const uploadTimestamp = parseInt(inputS3Key.split('-')[0])
      
      const response = await fetch('/api/check-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputS3Key,
          uploadTime: uploadTimestamp
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.found) {
        console.log(`📊 API: Found existing report: ${result.reportUrl}`)
        return [result.reportUrl]
      } else {
        console.log(`📊 API: No existing reports found`)
        return []
      }
    } catch (error) {
      console.error('Error checking existing reports:', error)
      return []
    }
  }

  /**
   * Monitor for new files via API route (bypasses CORS)
   */
  async monitorOutputBucket(
    inputS3Key: string,
    onNewFile: (fileUrl: string, fileName: string) => void
  ): Promise<void> {
    console.log(`🔍 API: Starting output bucket monitoring for: ${inputS3Key}`)
    
    // Extract upload timestamp from input key
    const uploadTimestamp = parseInt(inputS3Key.split('-')[0])
    
    const startTime = Date.now()
    const maxWaitTime = 5 * 60 * 1000 // 5 minutes
    const checkInterval = 10000 // Check every 10 seconds
    
    let lastCheckTime = startTime
    
    const checkForNewFiles = async (): Promise<boolean> => {
      try {
        console.log(`🔍 API: Checking for ANY new files after upload time...`)
        
        const response = await fetch('/api/check-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            inputS3Key,
            uploadTime: uploadTimestamp
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success && result.found) {
          // Check if this is a new file (newer than our last check)
          const fileModifiedTime = new Date(result.lastModified).getTime()
          
          if (fileModifiedTime > lastCheckTime) {
            console.log(`✅ API: Found new file in output bucket!`)
            console.log(`📄 New file detected: ${result.fileName}`)
            console.log(`🔗 File URL: ${result.reportUrl}`)
            console.log(`📅 File modified: ${result.lastModified}`)
            
            // Trigger the event
            onNewFile(result.reportUrl, result.fileName)
            return true // Stop monitoring
          } else {
            console.log(`📊 API: File exists but not new (older than last check)`)
          }
        } else {
          console.log(`❌ API: No new files found after upload time`)
          if (result.totalFiles > 0) {
            console.log(`📊 API: Total files in bucket: ${result.totalFiles}`)
          }
        }
        
        lastCheckTime = Date.now()
        return false
      } catch (error) {
        console.error('Error checking output bucket via API:', error)
        return false
      }
    }
    
    // Start monitoring loop
    const monitor = async () => {
      while (Date.now() - startTime < maxWaitTime) {
        const foundNewFile = await checkForNewFiles()
        if (foundNewFile) {
          return
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }
      
      console.log(`⏰ API: Output bucket monitoring timeout after ${Math.round((Date.now() - startTime) / 1000)} seconds`)
    }
    
    await monitor()
  }

  /**
   * Monitor processing status by checking for new reports in the output bucket
   */
  async monitorProcessingStatus(
    inputS3Key: string,
    onStatusUpdate: (status: ProcessingStatus) => void
  ): Promise<void> {
    const startTime = Date.now()
    const maxWaitTime = 5 * 60 * 1000 // 5 minutes max wait time (Lambda takes 2-2.5 minutes)
    const checkInterval = 15000 // Check every 15 seconds (less frequent since Lambda takes time)

    // Extract filename from input key (remove timestamp prefix)
    const inputFileName = inputS3Key.split('-').slice(1).join('-')
    const expectedReportPrefix = inputFileName.replace(/\.[^/.]+$/, '') // Remove file extension

    console.log(`🔍 Monitoring for report with prefix: ${expectedReportPrefix}`)
    console.log(`📁 Input S3 Key: ${inputS3Key}`)
    console.log(`📁 Expected report prefix: ${expectedReportPrefix}`)

    const checkForReport = async (): Promise<boolean> => {
      try {
        console.log(`🔍 Checking output bucket root for reports with prefix: ${expectedReportPrefix}`)
        
        // Look directly in the bucket root
        console.log(`📁 Looking for files with prefix: ${expectedReportPrefix}`)
        
        const command = new ListObjectsV2Command({
          Bucket: this.outputBucket,
          Prefix: expectedReportPrefix,
          MaxKeys: 10
        })

        const response = await this.s3Client.send(command)
        console.log(`📊 Found ${response.Contents?.length || 0} objects in bucket root`)
        
        // Log all found objects for debugging
        if (response.Contents && response.Contents.length > 0) {
          console.log(`📋 All objects found:`)
          response.Contents.forEach((obj, index) => {
            console.log(`  ${index + 1}. ${obj.Key} (Modified: ${obj.LastModified})`)
          })
          
          // Find the most recent report
          const latestReport = response.Contents
            .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0]

          if (latestReport && latestReport.Key) {
            const reportUrl = `https://${this.outputBucket}.s3.${this.region}.amazonaws.com/${latestReport.Key}`
            
            console.log(`✅ Found report in bucket root: ${latestReport.Key}`)
            console.log(`🔗 Report URL: ${reportUrl}`)
            console.log(`📅 Report modified: ${latestReport.LastModified}`)
            
            onStatusUpdate({
              status: "completed",
              progress: 100,
              message: "Report generated successfully!",
              reportUrl
            })
            
            return true
          }
        } else {
          console.log(`❌ No objects found with prefix: ${expectedReportPrefix}`)
          
          // Let's also check if there are ANY files in the bucket root
          const allFilesCommand = new ListObjectsV2Command({
            Bucket: this.outputBucket,
            MaxKeys: 20
          })
          
          const allFilesResponse = await this.s3Client.send(allFilesCommand)
          console.log(`📊 Total files in bucket root: ${allFilesResponse.Contents?.length || 0}`)
          
          if (allFilesResponse.Contents && allFilesResponse.Contents.length > 0) {
            console.log(`📋 All files in bucket root:`)
            allFilesResponse.Contents.forEach((obj, index) => {
              console.log(`  ${index + 1}. ${obj.Key} (Modified: ${obj.LastModified})`)
            })
          }
        }

        return false
      } catch (error) {
        console.error('Error checking for report:', error)
        onStatusUpdate({
          status: "error",
          progress: 0,
          message: "Failed to check for report",
          error: error instanceof Error ? error.message : "Unknown error"
        })
        return true // Stop monitoring on error
      }
    }

            // Initial status update
            onStatusUpdate({
              status: "processing",
              progress: 10,
              message: "Video uploaded, processing started..."
            })

    // Start monitoring loop
    const monitor = async () => {
      let progress = 10
      const progressIncrement = 1.0

      while (Date.now() - startTime < maxWaitTime) {
        // Simple progress updates
        progress = Math.min(progress + progressIncrement, 90)
        onStatusUpdate({
          status: "processing",
          progress,
          message: "Generating report..."
        })

        // Check for actual report
        const reportFound = await checkForReport()
        if (reportFound) {
          return
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }

      // Timeout reached
      console.log(`⏰ Processing timeout after ${Math.round((Date.now() - startTime) / 1000)} seconds`)
      onStatusUpdate({
        status: "error",
        progress: 0,
        message: "Processing timeout - report not found",
        error: "Report generation took longer than expected."
      })
    }

    await monitor()
  }

  /**
   * Download a report from S3
   */
  async downloadReport(reportUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const urlParts = reportUrl.split('/')
      const key = urlParts[urlParts.length - 1]

      const command = new GetObjectCommand({
        Bucket: this.outputBucket,
        Key: key
      })

      const response = await this.s3Client.send(command)
      
      if (!response.Body) {
        throw new Error('No report content found')
      }

      // Convert stream to blob
      const chunks: Uint8Array[] = []
      const reader = response.Body.transformToWebStream().getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      const blob = new Blob(chunks, { 
        type: response.ContentType || 'application/pdf' 
      })

      // Create download link
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = key
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)

      console.log(`✅ Report downloaded: ${key}`)
    } catch (error) {
      console.error('Download error:', error)
      throw new Error(`Failed to download report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List all available reports
   */
  async listReports(): Promise<Array<{ key: string; url: string; lastModified: Date; size: number }>> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.outputBucket,
        MaxKeys: 50
      })

      const response = await this.s3Client.send(command)
      
      if (!response.Contents) {
        return []
      }

      return response.Contents.map(obj => ({
        key: obj.Key || '',
        url: `https://${this.outputBucket}.s3.${this.region}.amazonaws.com/${obj.Key}`,
        lastModified: obj.LastModified || new Date(),
        size: obj.Size || 0
      }))
    } catch (error) {
      console.error('Error listing reports:', error)
      throw new Error(`Failed to list reports: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get the latest report
   */
  async getLatestReport(): Promise<{ key: string; url: string; lastModified: Date; size: number } | null> {
    try {
      const reports = await this.listReports()
      if (reports.length === 0) {
        return null
      }

      // Sort by last modified date and return the most recent
      return reports.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())[0]
    } catch (error) {
      console.error('Error getting latest report:', error)
      return null
    }
  }

  /**
   * Stop monitoring (cleanup)
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
}

// Export singleton instance
export const reportService = new ReportService()

// Export convenience functions
export const monitorProcessingStatus = (inputS3Key: string, onStatusUpdate: (status: ProcessingStatus) => void) => {
  return reportService.monitorProcessingStatus(inputS3Key, onStatusUpdate)
}

export const downloadReport = (reportUrl: string) => {
  return reportService.downloadReport(reportUrl)
}

export const listReports = () => {
  return reportService.listReports()
}

export const getLatestReport = () => {
  return reportService.getLatestReport()
}

export const checkExistingReports = (inputS3Key: string) => {
  return reportService.checkExistingReports(inputS3Key)
}

export const monitorOutputBucket = (inputS3Key: string, onNewFile: (fileUrl: string, fileName: string) => void) => {
  return reportService.monitorOutputBucket(inputS3Key, onNewFile)
}

// Export types
export type { ProcessingStatus }
