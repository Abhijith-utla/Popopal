"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Mic, ArrowLeft } from "lucide-react"

interface DashboardViewProps {
  uploadedFiles: any[]
  onBackToUpload: () => void
}

export function DashboardView({ uploadedFiles, onBackToUpload }: DashboardViewProps) {
  const [isListening, setIsListening] = useState(false)

  const handleDownloadReport = () => {
    alert("Report downloaded successfully!")
  }

  const handleVoiceAssistant = () => {
    setIsListening(!isListening)
    if (!isListening) {
      alert("Voice assistant activated. Speak your question...")
    } else {
      alert("Voice assistant deactivated.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <button
        onClick={onBackToUpload}
        className="absolute top-8 left-8 flex items-center gap-2 text-[#374f6b] hover:text-[#374f6b]/80 transition-colors group z-10"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Upload</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-6 relative z-10">
        {/* Download Report Card */}
        <Card
          className="minimal-card p-8 text-center cursor-pointer transition-all duration-300"
          onClick={handleDownloadReport}
        >
          <CardContent className="space-y-6">
            <div className="mx-auto w-16 h-16 police-gradient rounded-full flex items-center justify-center shadow-lg">
              <Download className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#374f6b] mb-2">Download Report</h3>
              <p className="text-sm text-muted-foreground">Get analysis results</p>
            </div>
          </CardContent>
        </Card>

        {/* Voice Assistant Card */}
        <Card
          className={`minimal-card p-8 text-center cursor-pointer transition-all duration-300 ${
            isListening ? "ring-2 ring-[#374f6b]/30 bg-[#374f6b]/5" : ""
          }`}
          onClick={handleVoiceAssistant}
        >
          <CardContent className="space-y-6">
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening ? "bg-red-500 animate-pulse" : "police-gradient"
              }`}
            >
              <Mic className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#374f6b] mb-2">Voice Assistant</h3>
              <p className="text-sm text-muted-foreground">
                {isListening ? "Listening..." : "Ask questions about analysis"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
