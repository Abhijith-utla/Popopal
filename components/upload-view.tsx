"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Upload, FileVideo, ArrowLeft } from "lucide-react"

interface UploadViewProps {
  onFilesUploaded: (files: any[]) => void
  onBackToLanding: () => void
}

export function UploadView({ onFilesUploaded, onBackToLanding }: UploadViewProps) {
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true)

      setTimeout(() => {
        const uploadResults = acceptedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        }))

        setIsUploading(false)
        onFilesUploaded(uploadResults)
      }, 2000)
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
