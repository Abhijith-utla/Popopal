"use client"

import { useState } from "react"
import { UploadView } from "@/components/upload-view"
import { DashboardView } from "@/components/dashboard-view"
import { LandingView } from "@/components/landing-view"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const [currentView, setCurrentView] = useState<"landing" | "upload" | "dashboard">("landing")
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  const handleFilesUploaded = (files: any[]) => {
    setUploadedFiles(files)
    setCurrentView("dashboard")
  }

  const handleBackToUpload = () => {
    setCurrentView("upload")
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
        <UploadView onFilesUploaded={handleFilesUploaded} onBackToLanding={handleBackToLanding} />
      ) : (
        <DashboardView uploadedFiles={uploadedFiles} onBackToUpload={handleBackToUpload} />
      )}

      <ThemeToggle />
    </main>
  )
}
