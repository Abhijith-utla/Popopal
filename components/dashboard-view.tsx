"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Mic, ArrowLeft, FileText, CheckCircle, Lock, RefreshCw } from "lucide-react"
import { monitorProcessingStatus, checkExistingReports, monitorOutputBucket } from "@/lib/report-service"

interface DashboardViewProps {
  uploadedFiles: any[]
  onBackToUpload: () => void
  reportUrl?: string // Optional report URL for download
}

export function DashboardView({ uploadedFiles, onBackToUpload, reportUrl }: DashboardViewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [currentReportUrl, setCurrentReportUrl] = useState<string>(reportUrl || "")
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [availableReports, setAvailableReports] = useState<any[]>([])
  const [monitoringStartTime, setMonitoringStartTime] = useState<number>(0)
  const [newReportDetected, setNewReportDetected] = useState<boolean>(false)
  const [isListening, setIsListening] = useState(false)
  
  // Speech recognition refs
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Monitor for reports in the background
  useEffect(() => {
    const latestFile = uploadedFiles[uploadedFiles.length - 1]
    if (!latestFile || !latestFile.s3Key) {
      return
    }

    console.log('🔍 Starting report monitoring for:', latestFile.s3Key)
    setIsMonitoring(true)
    setMonitoringStartTime(Date.now())

    const startMonitoring = async () => {
      try {
        // First, check for existing reports
        const existingReports = await checkExistingReports(latestFile.s3Key)
        if (existingReports.length > 0) {
          console.log('✅ Found existing reports:', existingReports)
          const reports = existingReports.map(url => ({
            url,
            name: url.split('/').pop() || 'Report',
            timestamp: new Date().toISOString()
          }))
          setAvailableReports(reports)
          setCurrentReportUrl(existingReports[0]) // Set first report as current
          setIsMonitoring(false)
          return
        }

                // If no existing reports, start monitoring output bucket for new files
                console.log('🔄 Starting output bucket monitoring for ANY new files...')
                await monitorOutputBucket(
                  latestFile.s3Key,
                  (fileUrl: string, fileName: string) => {
                    console.log('🎉 NEW FILE EVENT TRIGGERED!')
                    console.log('📄 File URL:', fileUrl)
                    console.log('📄 File Name:', fileName)
                    
                    // Update UI immediately when new file is detected
                    setCurrentReportUrl(fileUrl)
                    setIsMonitoring(false)
                    
                    // Add to available reports list
                    const newReport = {
                      url: fileUrl,
                      name: fileName,
                      timestamp: new Date().toISOString()
                    }
                    
                    console.log('📋 Adding new report to UI:', newReport)
                    setAvailableReports(prev => {
                      const exists = prev.some(r => r.url === fileUrl)
                      if (!exists) {
                        console.log('✅ Report added to available reports - UI updated!')
                        return [...prev, newReport]
                      } else {
                        console.log('📋 Report already exists in list')
                        return prev
                      }
                    })
                    
                    // Show success notification
                    console.log('🎊 Report is now available for download!')
                    setNewReportDetected(true)
                    
                    // Hide notification after 5 seconds
                    setTimeout(() => {
                      setNewReportDetected(false)
                    }, 5000)
                  }
                )
      } catch (error) {
        console.error('❌ Background monitoring failed:', error)
        setIsMonitoring(false)
      }
    }

    startMonitoring()
  }, [uploadedFiles])

  const handleDownloadReport = async () => {
    if (!currentReportUrl) {
      alert("No report available for download")
      return
    }

    setIsDownloading(true)
    try {
      console.log('📄 Downloading report via API:', currentReportUrl)
      
      // Download the report via API route (bypasses CORS)
      const response = await fetch('/api/download-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportUrl: currentReportUrl })
      })

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Download failed')
      }

      // Create a blob from the content
      const blob = new Blob([result.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = result.fileName || `report-${Date.now()}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('✅ Report downloaded successfully:', result.fileName)
    } catch (error) {
      console.error("Download error:", error)
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleManualRefresh = async () => {
    const latestFile = uploadedFiles[uploadedFiles.length - 1]
    if (!latestFile || !latestFile.s3Key) {
      alert("No uploaded file found")
      return
    }

    console.log('🔄 Manual refresh triggered - checking for ANY new files')
    setIsMonitoring(true)
    
    try {
      const existingReports = await checkExistingReports(latestFile.s3Key)
      if (existingReports.length > 0) {
        console.log('✅ Found reports on manual refresh:', existingReports)
        const reports = existingReports.map(url => ({
          url,
          name: url.split('/').pop() || 'Report',
          timestamp: new Date().toISOString()
        }))
        setAvailableReports(reports)
        setCurrentReportUrl(existingReports[0])
        setIsMonitoring(false)
      } else {
        console.log('❌ No new files found on manual refresh')
        setIsMonitoring(false)
      }
    } catch (error) {
      console.error('❌ Manual refresh failed:', error)
      setIsMonitoring(false)
    }
  }

  // Simple voice assistant handler
  const handleVoiceAssistant = () => {
    if (!isListening) {
      startVoiceSession()
    } else {
      stopVoiceSession()
    }
  }

  const startVoiceSession = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      setIsListening(true)
      console.log('🎤 Voice session started')
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      console.log('🎤 Speech recognized:', transcript)
      
      // Simple response
      speakText("I heard you say: " + transcript)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      console.log('🎤 Speech recognition ended')
    }

    recognitionRef.current.start()
  }

  const stopVoiceSession = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Simple text-to-speech
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.log('Speech synthesis not supported in this browser')
      return
    }

    // Stop any ongoing speech
    if (synthesisRef.current) {
      speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 0.9
    utterance.lang = 'en-US'

    utterance.onstart = () => {
      console.log('🔊 Speech synthesis started')
    }

    utterance.onend = () => {
      console.log('🔊 Speech synthesis ended')
    }

    utterance.onerror = (event) => {
      console.error('🔊 Speech synthesis error:', event.error)
    }

    synthesisRef.current = utterance
    speechSynthesis.speak(utterance)
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthesisRef.current) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      {/* New Report Notification */}
      {newReportDetected && (
        <div className="absolute top-8 right-8 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce z-20">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">New Report Available!</span>
          </div>
        </div>
      )}

      <button
        onClick={onBackToUpload}
        className="absolute top-8 left-8 flex items-center gap-2 text-[#374f6b] hover:text-[#374f6b]/80 transition-colors group z-10"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Upload</span>
      </button>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-6 relative z-10">
        {/* Download Report Card */}
        <Card className="minimal-card p-8 text-center transition-all duration-300">
          <CardContent className="space-y-6">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              availableReports.length > 0 ? 'police-gradient' : 'bg-gray-300'
            }`}>
              {availableReports.length > 0 ? (
                <Download className="h-8 w-8 text-white" />
              ) : (
                <Lock className="h-8 w-8 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#374f6b] mb-2">
                {availableReports.length > 0 ? 'Available Reports' : 'Report Processing'}
              </h3>
                      <p className="text-sm text-muted-foreground">
                        {availableReports.length > 0 
                          ? `${availableReports.length} report${availableReports.length > 1 ? 's' : ''} ready` 
                          : isMonitoring 
                            ? 'Generating report...' 
                            : 'Reports will appear here when ready'
                        }
                      </p>
              {availableReports.length > 0 ? (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600">Reports unlocked</span>
                </div>
              ) : isMonitoring ? (
                        <div className="flex flex-col items-center justify-center gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#374f6b] border-t-transparent"></div>
                            <span className="text-xs text-[#374f6b]">Generating report...</span>
                          </div>
                          <Button
                            onClick={handleManualRefresh}
                            size="sm"
                            variant="outline"
                            className="mt-2 text-[#374f6b] border-[#374f6b] hover:bg-[#374f6b]/10"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Check for Reports
                          </Button>
                        </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Reports locked</span>
                </div>
              )}
            </div>
            
                    {/* Download Button */}
                    {availableReports.length > 0 && (
                      <Button
                        onClick={handleDownloadReport}
                        disabled={isDownloading}
                        className="w-full bg-[#374f6b] hover:bg-[#374f6b]/90 transition-all duration-300 mt-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isDownloading ? "Downloading..." : "Download Report"}
                      </Button>
                    )}
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
                  isListening 
                    ? "bg-red-500 animate-pulse" 
                    : "police-gradient"
                }`}
              >
                <Mic className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#374f6b] mb-2">Voice Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  {isListening 
                    ? "Listening... Speak now" 
                    : "Click to start voice recognition"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
