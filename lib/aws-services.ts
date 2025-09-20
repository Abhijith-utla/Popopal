// Mock AWS services for demonstration purposes
// In production, these would be actual AWS SDK calls

export interface UploadProgress {
  fileName: string
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  message?: string
}

export interface AnalysisResult {
  jobId: string
  fileName: string
  status: "in-progress" | "completed" | "failed"
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
    uploadedAt: string
    fileSize: number
  }
}

class MockAWSServices {
  // Mock S3 upload
  async uploadToS3(file: File, onProgress: (progress: UploadProgress) => void): Promise<string> {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += Math.random() * 15) {
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

      onProgress({
        fileName: file.name,
        progress: Math.min(progress, 100),
        status: progress >= 100 ? "completed" : "uploading",
        message: progress >= 100 ? "Upload completed" : `Uploading... ${Math.round(progress)}%`,
      })

      if (progress >= 100) break
    }

    return `s3://police-dashcam-bucket/${uploadId}/${file.name}`
  }

  // Mock Rekognition Video analysis
  async startVideoAnalysis(s3Uri: string, fileName: string): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Simulate analysis start
    console.log(`[AWS Mock] Starting video analysis for ${fileName}`)
    console.log(`[AWS Mock] Job ID: ${jobId}`)
    console.log(`[AWS Mock] S3 URI: ${s3Uri}`)

    return jobId
  }

  // Mock analysis status check
  async getAnalysisStatus(jobId: string): Promise<"IN_PROGRESS" | "SUCCEEDED" | "FAILED"> {
    // Simulate processing time
    const processingTime = Math.random() * 5000 + 2000 // 2-7 seconds
    await new Promise((resolve) => setTimeout(resolve, processingTime))

    // 95% success rate
    return Math.random() > 0.05 ? "SUCCEEDED" : "FAILED"
  }

  // Mock analysis results retrieval
  async getAnalysisResults(jobId: string, fileName: string): Promise<AnalysisResult> {
    // Generate mock incidents
    const incidentTypes = [
      "Speed Violation",
      "Lane Change",
      "Following Distance",
      "Traffic Light Violation",
      "Stop Sign Violation",
      "Aggressive Driving",
      "Distracted Driving",
    ]

    const severities: Array<"low" | "medium" | "high"> = ["low", "medium", "high"]
    const numIncidents = Math.floor(Math.random() * 4) + 1

    const incidents = Array.from({ length: numIncidents }, (_, index) => {
      const minutes = Math.floor(Math.random() * 15)
      const seconds = Math.floor(Math.random() * 60)

      return {
        type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: `00:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        confidence: Math.floor(Math.random() * 25) + 75, // 75-100%
        description: `Detected ${incidentTypes[Math.floor(Math.random() * incidentTypes.length)].toLowerCase()} with high confidence`,
      }
    })

    return {
      jobId,
      fileName,
      status: "completed",
      confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
      incidents: incidents.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      metadata: {
        duration: `00:${Math.floor(Math.random() * 20 + 5)
          .toString()
          .padStart(2, "0")}:${Math.floor(Math.random() * 60)
          .toString()
          .padStart(2, "0")}`,
        location: `Highway ${Math.floor(Math.random() * 500 + 1)}, Mile Marker ${Math.floor(Math.random() * 100 + 1)}`,
        uploadedAt: new Date().toISOString(),
        fileSize: Math.floor(Math.random() * 500 + 100), // MB
      },
    }
  }

  // Mock Textract for document analysis (if needed)
  async analyzeDocument(s3Uri: string): Promise<any> {
    console.log(`[AWS Mock] Analyzing document at ${s3Uri}`)

    return {
      documentMetadata: {
        pages: 1,
      },
      blocks: [
        {
          blockType: "LINE",
          text: "Police Report - Traffic Incident",
          confidence: 99.5,
        },
      ],
    }
  }

  // Mock Lambda function invocation
  async invokeLambda(functionName: string, payload: any): Promise<any> {
    console.log(`[AWS Mock] Invoking Lambda function: ${functionName}`)
    console.log(`[AWS Mock] Payload:`, payload)

    // Simulate Lambda processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Function executed successfully",
        result: "Analysis completed",
        timestamp: new Date().toISOString(),
      }),
    }
  }

  // Mock CloudWatch logging
  async logEvent(logGroup: string, logStream: string, message: string): Promise<void> {
    console.log(`[AWS Mock CloudWatch] ${logGroup}/${logStream}: ${message}`)
  }
}

// Export singleton instance
export const awsServices = new MockAWSServices()

// Helper function to simulate real AWS integration points
export const AWS_CONFIG = {
  region: "us-east-1",
  s3Bucket: "police-dashcam-bucket",
  rekognitionRole: "arn:aws:iam::123456789012:role/RekognitionServiceRole",
  lambdaFunctions: {
    videoProcessor: "police-video-processor",
    reportGenerator: "police-report-generator",
    notificationSender: "police-notification-sender",
  },
  cloudWatchLogs: {
    logGroup: "/aws/lambda/police-dashcam-analysis",
    logStream: "video-processing",
  },
}

// Mock environment variables that would be used in production
export const ENV_VARS = {
  AWS_ACCESS_KEY_ID: "mock-access-key",
  AWS_SECRET_ACCESS_KEY: "mock-secret-key",
  AWS_REGION: "us-east-1",
  S3_BUCKET_NAME: "police-dashcam-bucket",
  REKOGNITION_ROLE_ARN: "arn:aws:iam::123456789012:role/RekognitionServiceRole",
}
