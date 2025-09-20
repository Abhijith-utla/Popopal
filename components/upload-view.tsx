"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Upload, FileVideo, ArrowLeft } from "lucide-react"
import { apiStorage, type UploadProgress, type VideoFile } from "@/lib/api-storage"

interface UploadViewProps {
  onFilesUploaded: (files: any[]) => void
  onBackToLanding: () => void
  onStartProcessing: (files: any[]) => void
}

export function UploadView({ onFilesUploaded, onBackToLanding, onStartProcessing }: UploadViewProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      console.log('📁 Files dropped in upload-view:', acceptedFiles)
      console.log('❌ Rejected files:', rejectedFiles)
      
      if (acceptedFiles.length === 0) {
        console.log('No files to upload')
        if (rejectedFiles.length > 0) {
          console.log('Files were rejected:', rejectedFiles)
          alert(`Files rejected: ${rejectedFiles.map(f => f.file.name).join(', ')}`)
        }
        return
      }
      
      setIsUploading(true)
      setUploadProgress(0)

      try {
        console.log('🚀 Starting API upload process...')
        console.log('📁 Files to upload:', acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })))
        
        // Upload each file individually via API
        const uploadedFiles = []
        
        for (let i = 0; i < acceptedFiles.length; i++) {
          const file = acceptedFiles[i]
          console.log(`📤 Uploading file ${i + 1}/${acceptedFiles.length}: ${file.name} (${file.size} bytes)`)
          
          try {
            // Fast upload with shorter timeout
            const uploadPromise = apiStorage.uploadVideo(file, (progress) => {
              console.log(`📊 Fast progress for ${file.name}: ${progress.progress}% - ${progress.message}`)
              setUploadProgress(progress.progress)
            })
            
            // Shorter timeout for faster feedback
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
            )
            
            const result = await Promise.race([uploadPromise, timeoutPromise]) as any
            
            console.log(`✅ Successfully uploaded ${file.name}:`, result)
            
            // Create file data for UI
            const fileData = {
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              s3Key: result.key,
              s3Url: result.url
            }
            
            uploadedFiles.push(fileData)
            
          } catch (fileError) {
            console.error(`❌ Failed to upload ${file.name}:`, fileError)
            alert(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
          }
        }
        
        console.log('✅ All uploads completed. Successfully uploaded:', uploadedFiles.length, 'files')
        
        if (uploadedFiles.length > 0) {
          onFilesUploaded(uploadedFiles)
          // Start processing after successful upload
          onStartProcessing(uploadedFiles)
        } else {
          alert('No files were successfully uploaded')
        }
        
      } catch (error) {
        console.error("❌ Upload error:", error)
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        console.log('🏁 Upload process finished')
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [onFilesUploaded, onStartProcessing],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".wmv", ".mkv"],
      "*/*": [] // Allow all file types for testing
    },
    multiple: true,
    maxSize: 500 * 1024 * 1024,
  })

  // Show loading page during upload
  if (isUploading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <style jsx>{`
          @keyframes rotateAround {
            from { transform: rotate(0deg) translateX(128px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(128px) rotate(-360deg); }
          }
          @keyframes rotateAroundReverse {
            from { transform: rotate(0deg) translateX(128px) rotate(0deg); }
            to { transform: rotate(-360deg) translateX(128px) rotate(360deg); }
          }
          .cop-head {
            animation: rotateAround 4s linear infinite;
          }
          .thief-head {
            animation: rotateAroundReverse 4s linear infinite;
          }
        `}</style>
        
        <div className="relative w-64 h-64">
          {/* Outer Circle */}
          <div className="absolute inset-0 border-4 border-[#374f6b] rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
          
          {/* Inner Circle */}
          <div className="absolute inset-4 border-2 border-[#374f6b]/50 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
          
          {/* Cop Head - Rotating */}
          <div className="absolute top-1/2 left-1/2 cop-head">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-800 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-500"></div>
          </div>
          
          {/* Thief Head - Rotating */}
          <div className="absolute top-1/2 left-1/2 thief-head">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-800 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-500"></div>
          </div>
          
          {/* Center Upload Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 police-gradient rounded-full flex items-center justify-center animate-pulse">
              <Upload className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        {/* Upload Text */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
          <h2 className="text-xl font-semibold text-[#374f6b] mb-2">Uploading Files</h2>
          <p className="text-sm text-muted-foreground">Cop is chasing the thief...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <Button
        onClick={onBackToLanding}
        variant="ghost"
        size="icon"
        className="absolute top-6 left-6 w-10 h-10 text-[#374f6b] hover:bg-[#374f6b]/10 transition-all duration-300 hover:scale-110 animate-slide-in-left"
      >
        <ArrowLeft className="h-5 w-5 transition-transform duration-300 hover:-translate-x-1" />
      </Button>

      <div className="w-full max-w-md animate-fade-in-up">
        <div
          {...getRootProps()}
          className={`upload-zone rounded-xl p-12 text-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
            isDragActive ? "dragover animate-pulse" : ""
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 police-gradient rounded-full flex items-center justify-center hover:rotate-12 transition-transform duration-300 animate-bounce-in">
              <FileVideo className="h-8 w-8 text-white" />
            </div>
            {isDragActive ? (
              <p className="text-xl font-semibold text-[#374f6b] animate-pulse">Drop files here</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xl font-semibold text-[#374f6b] animate-fade-in-delayed">Upload Files</p>
                <Button
                  size="lg"
                  className="px-8 bg-[#374f6b] hover:bg-[#374f6b]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#374f6b]/25 hover:scale-105"
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2 transition-transform duration-300 hover:rotate-12" />
                  {isUploading ? "Processing..." : "Select Files"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
