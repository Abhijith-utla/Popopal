"use client"

import { useState } from "react"
import { UploadView } from "@/components/upload-view"
import { DashboardView } from "@/components/dashboard-view" // Updated with reportUrl prop
import { LandingView } from "@/components/landing-view"
import { ProcessingView } from "@/components/processing-view"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const [currentView, setCurrentView] = useState<"landing" | "upload" | "processing" | "dashboard">("landing")
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [reportUrl, setReportUrl] = useState<string>("")

  const handleFilesUploaded = (files: any[]) => {
    setUploadedFiles(files)
  }

  const handleStartProcessing = (files: any[]) => {
    setUploadedFiles(files)
    // Skip processing view, go directly to dashboard
    setCurrentView("dashboard")
  }

  const handleProcessingComplete = (url: string) => {
    setReportUrl(url)
    setCurrentView("dashboard")
  }

  const handleBackToUpload = () => {
    setCurrentView("upload")
  }

  const handleBackToProcessing = () => {
    setCurrentView("processing")
  }

  const handleGoToUpload = () => {
    setCurrentView("upload")
  }

  const handleBackToLanding = () => {
    setCurrentView("landing")
  }


  return (
    <main className="min-h-screen bg-background transition-colors duration-300">
      <div className="crime-scene-lights">
        <div className="flash-light red"></div>
        <div className="flash-light blue"></div>
        <div className="flash-light red"></div>
        <div className="flash-light blue"></div>
        <div className="flash-light red"></div>
        <div className="flash-light blue"></div>
        <div className="flash-light red"></div>
        <div className="flash-light blue"></div>
      </div>

      {currentView === "landing" ? (
        <LandingView onGoToUpload={handleGoToUpload} />
      ) : currentView === "upload" ? (
        <UploadView 
          onFilesUploaded={handleFilesUploaded} 
          onBackToLanding={handleBackToLanding}
          onStartProcessing={handleStartProcessing}
        />
      ) : currentView === "processing" ? (
        <ProcessingView 
          uploadedFiles={uploadedFiles}
          onBackToUpload={handleBackToUpload}
          onProcessingComplete={handleProcessingComplete}
        />
      ) : (
        <DashboardView 
          uploadedFiles={uploadedFiles} 
          onBackToUpload={handleBackToUpload}
          reportUrl={reportUrl}
        />
      )}

      <ThemeToggle />
    </main>
  )
}
