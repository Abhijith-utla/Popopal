"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Upload, FileVideo, ArrowLeft } from "lucide-react"
import { s3Storage, type UploadProgress, type VideoFile } from "@/lib/s3-storage"

interface UploadViewProps {
  onFilesUploaded: (files: any[]) => void
  onBackToLanding: () => void
}

export function UploadView({ onFilesUploaded, onBackToLanding }: UploadViewProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.log('📁 Files dropped in upload-view:', acceptedFiles)
      
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
            })
            
            console.log(`✅ Successfully uploaded ${file.name} to S3:`, result)
            
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
          alert(`✅ Successfully uploaded ${uploadedFiles.length} file(s) to S3 bucket!`)
        }
        
      } catch (error) {
        console.error("Upload error:", error)
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [onFilesUploaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".wmv", ".mkv"],
    },
    multiple: true,
    maxSize: 500 * 1024 * 1024,
  })

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
