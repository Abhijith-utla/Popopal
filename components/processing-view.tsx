"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { monitorProcessingStatus } from "@/lib/report-service"

interface ProcessingViewProps {
  uploadedFiles: any[]
  onBackToUpload: () => void
  onProcessingComplete: (reportUrl: string) => void
}

interface ProcessingStatus {
  status: "processing" | "completed" | "error"
  progress: number
  message: string
  reportUrl?: string
  error?: string
}

export function ProcessingView({ uploadedFiles, onBackToUpload, onProcessingComplete }: ProcessingViewProps) {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: "processing",
    progress: 0,
    message: "Uploading video to processing queue..."
  })

  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    // Monitor real processing status from Lambda function
    const startRealProcessing = async () => {
      try {
        // Get the latest uploaded file
        const latestFile = uploadedFiles[uploadedFiles.length - 1]
        if (!latestFile) {
          setProcessingStatus({
            status: "error",
            progress: 0,
            message: "No files found to process",
            error: "No uploaded files available"
          })
          return
        }

        console.log(`🎬 Starting real processing monitoring for: ${latestFile.name}`)
        console.log(`📁 S3 Key: ${latestFile.s3Key}`)

        // Start monitoring with real Lambda processing
        await monitorProcessingStatus(
          latestFile.s3Key,
          (status) => {
            console.log(`📊 Processing status update:`, status)
            setProcessingStatus(status)
            
            // If processing is complete, transition to dashboard
            if (status.status === "completed" && status.reportUrl) {
              console.log(`✅ Real processing completed, transitioning to dashboard`)
              onProcessingComplete(status.reportUrl)
            }
          }
        )
      } catch (error) {
        console.error('Processing monitoring error:', error)
        setProcessingStatus({
          status: "error",
          progress: 0,
          message: "Failed to monitor processing status",
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    startRealProcessing()
  }, [uploadedFiles, onProcessingComplete])

  const handleDownloadReport = async () => {
    if (!processingStatus.reportUrl) return

    setIsDownloading(true)
    try {
      console.log('📄 Downloading real report from S3:', processingStatus.reportUrl)
      
      // Download the real report from S3
      const response = await fetch(processingStatus.reportUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Extract filename from URL
      const urlParts = processingStatus.reportUrl.split('/')
      const filename = urlParts[urlParts.length - 1] || `report-${Date.now()}.pdf`
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('✅ Real report downloaded successfully:', filename)
    } catch (error) {
      console.error("Download error:", error)
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const getStatusIcon = () => {
    switch (processingStatus.status) {
      case "completed":
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-500" />
      default:
        return <Clock className="h-8 w-8 text-blue-500 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (processingStatus.status) {
      case "completed":
        return "text-green-600"
      case "error":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <Button
        onClick={onBackToUpload}
        variant="ghost"
        size="icon"
        className="absolute top-6 left-6 w-10 h-10 text-[#374f6b] hover:bg-[#374f6b]/10 transition-all duration-300 hover:scale-110"
      >
        <ArrowLeft className="h-5 w-5 transition-transform duration-300 hover:-translate-x-1" />
      </Button>

      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="minimal-card p-8 text-center">
          <CardContent className="space-y-6">
            {/* Status Icon */}
            <div className="mx-auto w-20 h-20 flex items-center justify-center">
              {getStatusIcon()}
            </div>

            {/* Status Message */}
            <div className="space-y-2">
              <h2 className={`text-xl font-semibold ${getStatusColor()}`}>
                {processingStatus.status === "completed" ? "Processing Complete!" : 
                 processingStatus.status === "error" ? "Processing Failed" : 
                 "Processing Video..."}
              </h2>
              <p className="text-sm text-muted-foreground">
                {processingStatus.message}
              </p>
            </div>

            {/* Progress Bar */}
            {processingStatus.status === "processing" && (
              <div className="space-y-2">
                <Progress value={processingStatus.progress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(processingStatus.progress)}% complete
                </p>
              </div>
            )}

            {/* Error Message */}
            {processingStatus.status === "error" && processingStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{processingStatus.error}</p>
              </div>
            )}

            {/* Download Button */}
            {processingStatus.status === "completed" && processingStatus.reportUrl && (
              <Button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="w-full bg-[#374f6b] hover:bg-[#374f6b]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#374f6b]/25"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Downloading..." : "Download Report"}
              </Button>
            )}

            {/* Processing Steps */}
            {processingStatus.status === "processing" && (
              <div className="space-y-2 text-left">
                <div className="text-xs text-muted-foreground">Processing Steps:</div>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${processingStatus.progress >= 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${processingStatus.progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Video uploaded to S3
                  </div>
                  <div className={`flex items-center gap-2 ${processingStatus.progress >= 50 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${processingStatus.progress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Lambda processing started
                  </div>
                  <div className={`flex items-center gap-2 ${processingStatus.progress >= 80 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${processingStatus.progress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Report generation in progress
                  </div>
                  <div className={`flex items-center gap-2 ${processingStatus.progress >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${processingStatus.progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Report ready for download
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
