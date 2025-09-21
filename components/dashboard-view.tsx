"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Mic, ArrowLeft, FileText, CheckCircle, Lock, RefreshCw } from "lucide-react"
import { monitorProcessingStatus, checkExistingReports, monitorOutputBucket } from "@/lib/report-service"
import io from "socket.io-client"
import { AudioPlayer } from "@/lib/audio-player"

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
  const [voiceStatus, setVoiceStatus] = useState("Disconnected")
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  
  // Voice/chatbot streaming refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const socketRef = useRef<any>(null)
  const sessionInitializedRef = useRef<boolean>(false)
  const roleRef = useRef<string>("")
  const isStreamingRef = useRef(false)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  
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

  // ===== Voice/Socket helpers =====
  const VOICE_SERVER_URL = "http://localhost:3003" // Force correct port

  const connectSocket = async () => {
    if (socketRef.current?.connected) {
      console.log('🔗 Socket already connected')
      return
    }
    console.log('🔗 Connecting to:', VOICE_SERVER_URL)
    return new Promise<void>((resolve) => {
      const s = io(VOICE_SERVER_URL, { transports: ["websocket", "polling"] })
      socketRef.current = s

      s.on("connect", () => {
        console.log('✅ Socket connected successfully')
        setVoiceStatus("Connected")
        sessionInitializedRef.current = false
        resolve()
      })

      s.on("disconnect", () => {
        setVoiceStatus("Disconnected")
        sessionInitializedRef.current = false
      })

      // Server event handlers
      s.on("contentStart", (data: any) => {
        if (data?.type === "TEXT" && data?.role) {
          roleRef.current = data.role
        }
      })

      s.on("textOutput", (data: any) => {
        if (data?.content && data?.role) {
          setChatMessages(prev => [...prev, { role: data.role, content: data.content }])
        }
      })

      s.on("audioOutput", (data: any) => {
        if (!data?.content) return
        console.log('🔊 Received audio output, length:', data.content.length)
        try {
          const audioData = base64ToFloat32(data.content)
          console.log('🔊 Converted audio data, samples:', audioData.length)
          
          // Route audio to AudioPlayer worklet for smooth conversational playback
          audioPlayerRef.current?.playAudio(audioData)
        } catch (e) {
          console.error('❌ Error handling audio:', e)
        }
      })

      s.on("contentEnd", (data: any) => {
        try {
          if (data?.stopReason && String(data.stopReason).toUpperCase() === 'INTERRUPTED') {
            // Barge-in: clear any buffered audio
            audioPlayerRef.current?.bargeIn()
          }
        } catch {}
      })

      s.on("streamComplete", () => {
        // Stop streaming if needed
        stopVoiceSession()
      })

      s.on("error", (err: any) => {
        // eslint-disable-next-line no-console
        console.error("Voice server error:", err)
      })
    })
  }

  const initAudio = async () => {
    if (audioStreamRef.current && audioContextRef.current) return
    
    console.log('🎤 Requesting microphone access...')
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })
    audioStreamRef.current = stream
    
    // Use 16kHz for microphone capture (matches original server input)
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new AudioPlayer()
      await audioPlayerRef.current.start()
    }
    
    console.log('✅ Audio initialized at 16kHz')
  }

  const initializeSession = async () => {
    if (!socketRef.current) {
      console.log('❌ Cannot initialize session - no socket')
      return
    }
    if (sessionInitializedRef.current) {
      console.log('⚠️ Session already initialized')
      return
    }
    console.log('📨 Sending session initialization events...')
    socketRef.current.emit("promptStart")
    console.log('📨 Sent promptStart')
    socketRef.current.emit("systemPrompt")
    console.log('📨 Sent systemPrompt')
    socketRef.current.emit("audioStart")
    console.log('📨 Sent audioStart')
    sessionInitializedRef.current = true
    console.log('✅ Session initialization complete')
  }

  const startVoiceSession = async () => {
    console.log('🚀 Starting voice session...')
    try {
      console.log('📡 Connecting socket...')
      await connectSocket()
      console.log('🎤 Initializing audio...')
      await initAudio()
      console.log('⚙️ Initializing session...')
      await initializeSession()

      if (!audioContextRef.current || !audioStreamRef.current) return

      const sourceNode = audioContextRef.current.createMediaStreamSource(audioStreamRef.current)
      sourceNodeRef.current = sourceNode

      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1)
      processorRef.current = processor

      // Set streaming flag and listening state BEFORE setting up the processor
      isStreamingRef.current = true
      setIsListening(true)
      setVoiceStatus("Streaming... Speak now")

      processor.onaudioprocess = (e) => {
        if (!isStreamingRef.current || !socketRef.current) return
        
        const inputData = e.inputBuffer.getChannelData(0)
        
        // Convert to 16-bit PCM exactly like the original bedrock example
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
        }
        
        // Convert to base64 exactly like original
        const base64Data = arrayBufferToBase64(pcmData.buffer)
        
        // Send to server exactly like original  
        socketRef.current.emit('audioInput', base64Data)
      }

      sourceNode.connect(processor)
      processor.connect(audioContextRef.current.destination)

      // Small delay to ensure everything is connected
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('✅ Voice session started successfully - ready to capture audio')
    } catch (e) {
      console.error('❌ Error starting voice session:', e)
      setIsListening(false)
      setVoiceStatus("Error starting microphone")
    }
  }

  const stopVoiceSession = async () => {
    isStreamingRef.current = false
    setIsListening(false)
    setVoiceStatus("Processing...")
    
    try {
      socketRef.current?.emit("stopAudio")
    } catch {}

    // Teardown nodes exactly like original
    try {
      if (processorRef.current) {
        processorRef.current.disconnect()
        processorRef.current = null
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect()
        sourceNodeRef.current = null
      }
    } catch {}

    try { audioPlayerRef.current?.stop() } catch {}
    setVoiceStatus("Ready")
  }

  // Helpers
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  const base64ToFloat32 = (b64: string): Float32Array => {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const int16 = new Int16Array(bytes.buffer)
    const out = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) out[i] = int16[i] / 32768.0
    return out
  }

  // Cleanup socket/audio on unmount
  useEffect(() => {
    return () => {
      try { processorRef.current?.disconnect() } catch {}
      try { sourceNodeRef.current?.disconnect() } catch {}
      try { audioStreamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
      try { audioContextRef.current?.close() } catch {}
      try { socketRef.current?.disconnect() } catch {}
    }
  }, [])

  // Simple voice assistant handler
  const handleVoiceAssistant = () => {
    console.log('🎤 Voice Assistant clicked, isListening:', isListening)
    console.log('🔗 VOICE_SERVER_URL:', VOICE_SERVER_URL)
    if (!isListening) {
      startVoiceSession()
    } else {
      stopVoiceSession()
    }
  }

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
                <p className="text-xs text-gray-500 mt-1">Status: {voiceStatus}</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}