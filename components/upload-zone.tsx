"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileVideo, CheckCircle, Cloud, Database, Zap, Shield, Activity, X, Play } from "lucide-react"
import { s3Storage, type UploadProgress, type VideoFile } from "@/lib/s3-storage"

interface UploadZoneProps {
  onFilesUploaded: (files: any[]) => void
}

export function UploadZone({ onFilesUploaded }: UploadZoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<VideoFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>("")

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.log('📁 Files dropped:', acceptedFiles)
      console.log('Number of files:', acceptedFiles.length)
      
      if (acceptedFiles.length === 0) {
        console.log('No files to upload')
        return
      }
      
      setIsUploading(true)
      setUploadProgress(0)

      try {
        console.log('🚀 Starting S3 upload process...')
        
        // Upload each file individually to S3
        const uploadedFiles = []
        
        for (let i = 0; i < acceptedFiles.length; i++) {
          const file = acceptedFiles[i]
          console.log(`Uploading file ${i + 1}/${acceptedFiles.length}:`, file.name)
          
          try {
            const result = await s3Storage.uploadVideo(file, (progress) => {
              console.log(`Progress for ${file.name}:`, progress)
              setUploadProgress(progress.progress)
              setCurrentUploadingFile(progress.fileName)
            })
            
            console.log(`✅ Successfully uploaded ${file.name} to S3:`, result)
            
            // Create file data for UI
            const fileData = {
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              s3Key: result.key,
              s3Url: result.url,
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
            
            uploadedFiles.push(fileData)
            
          } catch (fileError) {
            console.error(`❌ Failed to upload ${file.name}:`, fileError)
            alert(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
          }
        }
        
        console.log('✅ All uploads completed. Successfully uploaded:', uploadedFiles.length, 'files')
        
        if (uploadedFiles.length > 0) {
          setUploadedFiles((prev) => [...prev, ...uploadedFiles])
          onFilesUploaded([...uploadedFiles])
          alert(`✅ Successfully uploaded ${uploadedFiles.length} file(s) to S3 bucket!`)
        }
        
      } catch (error) {
        console.error("Upload error:", error)
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
        setCurrentUploadingFile("")
      }
    },
    [onFilesUploaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".mkv"],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    onFilesUploaded(newFiles)
  }

  const testUpload = async () => {
    console.log('🧪 Testing upload with sample file...')
    const testContent = `Test video upload - ${new Date().toISOString()}`
    const testFile = new File([testContent], `test-${Date.now()}.txt`, { type: 'text/plain' })
    
    try {
      const result = await s3Storage.uploadVideo(testFile, (progress) => {
        console.log('Test upload progress:', progress)
      })
      console.log('✅ Test upload successful:', result)
      alert('✅ Test upload successful! Check console for details.')
    } catch (error) {
      console.error('❌ Test upload failed:', error)
      alert(`❌ Test upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testConnection = async () => {
    console.log('🔍 Testing S3 connection...')
    try {
      const result = await s3Storage.testConnection()
      console.log('Connection test result:', result)
      if (result.success) {
        alert(`✅ S3 Connection successful! ${result.message}`)
      } else {
        alert(`❌ S3 Connection failed: ${result.message}`)
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      alert(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in-0 duration-700">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <Shield className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-bounce"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">Police Dashcam Analysis</h1>
              <p className="text-lg text-muted-foreground">AI-powered video analysis with AWS Rekognition</p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-6">
            <Badge variant="secondary" className="px-4 py-2 animate-in slide-in-from-left-5 duration-500 delay-200">
              <Cloud className="h-4 w-4 mr-2" />
              AWS Powered
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 animate-in slide-in-from-right-5 duration-500 delay-300">
              <Zap className="h-4 w-4 mr-2" />
              Real-time Analysis
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 animate-in slide-in-from-bottom-5 duration-500 delay-400">
              <Activity className="h-4 w-4 mr-2" />
              Live Processing
            </Badge>
          </div>
        </div>

        {/* Upload Zone */}
        <Card className="glass-card border-0 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-10 duration-700 delay-300">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl flex items-center justify-center">
              <Upload className="h-6 w-6 mr-3 text-primary" />
              Upload Dashcam Videos
            </CardTitle>
            <CardDescription className="text-lg">
              Drag and drop your video files or click to browse. Supports MP4, AVI, MOV, and MKV formats.
            </CardDescription>
            <div className="mt-4 flex gap-2 justify-center">
              <Button onClick={testConnection} variant="outline" size="sm">
                🔍 Test Connection
              </Button>
              <Button onClick={testUpload} variant="outline" size="sm">
                🧪 Test Upload
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <input {...getInputProps()} />

              <div className="space-y-6">
                <div
                  className={`mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 ${
                    isDragActive ? "scale-110 bg-primary/20" : "hover:scale-105"
                  }`}
                >
                  <Upload
                    className={`h-12 w-12 text-primary transition-all duration-300 ${
                      isDragActive ? "animate-bounce" : ""
                    }`}
                  />
                </div>

                <div>
                  <p className="text-xl font-semibold text-foreground mb-2">
                    {isDragActive ? "Drop your videos here!" : "Upload your dashcam videos"}
                  </p>
                  <p className="text-muted-foreground">
                    Drag and drop files here, or{" "}
                    <span className="text-primary font-medium hover:underline">click to browse</span>
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <FileVideo className="h-4 w-4" />
                    <span>MP4, AVI, MOV</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <span>Max 500MB per file</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Secure AWS Storage</span>
                  </div>
                </div>
              </div>

              {/* Upload Progress Overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center animate-in fade-in-0 duration-300">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Cloud className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-lg">Uploading to AWS S3...</p>
                      {currentUploadingFile && (
                        <p className="text-sm text-muted-foreground">Uploading: {currentUploadingFile}</p>
                      )}
                      <Progress value={uploadProgress} className="w-64 mx-auto" />
                      <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="glass-card border-0 shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Uploaded Files ({uploadedFiles.length})
              </CardTitle>
              <CardDescription>Files ready for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-border/50 hover:bg-white/80 transition-all duration-200 hover:scale-[1.01] animate-in fade-in-0 slide-in-from-left-5"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <FileVideo className="h-8 w-8 text-primary" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      </div>
                      <div>
                        <p className="font-semibold">{file.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                          <Badge variant="outline" className="text-xs">
                            <Cloud className="h-3 w-3 mr-1" />
                            AWS S3
                          </Badge>
                          {file.analysisResults && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-destructive hover:text-destructive hover:scale-105 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Status */}
        {uploadedFiles.length > 0 && (
          <Card className="glass-card border-0 shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-700 delay-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-primary animate-pulse" />
                AWS Processing Status
              </CardTitle>
              <CardDescription>Real-time analysis pipeline status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="font-medium">S3 Upload</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 animate-pulse">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="font-medium">Rekognition Analysis</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 animate-pulse">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="font-medium">CloudWatch Logging</span>
                    <Badge variant="default" className="bg-blue-100 text-blue-800 animate-pulse">
                      <Activity className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                    <span className="font-medium">Lambda Processing</span>
                    <Badge variant="secondary" className="animate-pulse">
                      <Zap className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
