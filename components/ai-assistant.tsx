"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, User, Send, Loader2, FileVideo, Mic, MicOff, Volume2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: string[]
  confidence?: number
}

interface AiAssistantProps {
  selectedReport: any
}

export function AiAssistant({ selectedReport }: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Nova Sonic AI assistant powered by AWS Bedrock. I can analyze police reports and video analysis using RAG (Retrieval-Augmented Generation) from your S3 reports. I can also process speech-to-speech interactions. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [useNovaSonic, setUseNovaSonic] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Generate response using Nova Sonic with RAG
  const generateNovaResponse = async (userMessage: string): Promise<{ content: string; sources?: string[]; confidence?: number }> => {
    try {
      console.log('🤖 Generating Nova Sonic response...')
      
      const response = await fetch('/api/nova-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Nova Sonic request failed')
      }

      console.log('✅ Nova Sonic response received')
      return {
        content: result.content,
        sources: result.sources,
        confidence: result.confidence
      }
    } catch (error) {
      console.error('❌ Nova Sonic error:', error)
      
      // Fallback response
      return {
        content: `I apologize, but I'm having trouble connecting to Nova Sonic right now. Please try again in a moment. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources: [],
        confidence: 0
      }
    }
  }

  // Fallback mock responses for when Nova Sonic is disabled
  const generateMockResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()

    if (message.includes("confidence") || message.includes("accuracy")) {
      return `The confidence scores in this analysis range from 78% to 95%. These scores are calculated based on multiple factors including object detection accuracy, motion pattern recognition, and environmental conditions. Higher confidence scores (>90%) indicate very reliable detections, while scores between 70-90% are still actionable but may require additional review.`
    }

    if (message.includes("speed") || message.includes("violation")) {
      return `The speed violation detected at timestamp 00:03:45 shows a vehicle exceeding the posted speed limit by approximately 15-20 mph. This was determined through frame-by-frame analysis of vehicle movement relative to road markers and known distances. The 95% confidence indicates this is a highly reliable detection.`
    }

    if (message.includes("help") || message.includes("what can you")) {
      return `I can help you with:
• Explaining confidence scores and analysis methods
• Providing details about specific incidents
• Clarifying technical terminology
• Suggesting follow-up actions
• Generating summary reports
• Answering questions about evidence clips

What specific aspect would you like to know more about?`
    }

    // Default response
    return `I understand you're asking about "${userMessage}". Based on the current analysis of ${selectedReport?.fileName || "this video"}, I can provide more specific information. Could you clarify what particular aspect you'd like me to explain?`
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      let response: { content: string; sources?: string[]; confidence?: number }
      
      if (useNovaSonic) {
        response = await generateNovaResponse(userMessage.content)
      } else {
        response = {
          content: generateMockResponse(userMessage.content),
          sources: [],
          confidence: 0.8
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence
      }

      setMessages((prev) => [...prev, assistantMessage])
      
      // Auto-speak the response if speech is enabled
      if (isSpeaking) {
        speakText(response.content)
      }
      
    } catch (error) {
      console.error('Error generating response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Speech recognition functions for live interaction
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    // Enable continuous listening for live interaction
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      setIsListening(true)
      console.log('🎤 Live speech recognition started')
      
      // Add a visual indicator message
      const listeningMessage: Message = {
        id: `listening-${Date.now()}`,
        role: "assistant",
        content: "🎤 I'm listening... Speak naturally and I'll respond in real-time!",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, listeningMessage])
    }

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Update input with interim results for live feedback
      if (interimTranscript) {
        setInputValue(interimTranscript)
      }

      // Process final transcript immediately
      if (finalTranscript.trim()) {
        console.log('🎤 Final speech recognized:', finalTranscript)
        
        // Clear input and process immediately
        setInputValue('')
        
        // Process the speech input immediately
        processSpeechInput(finalTranscript.trim())
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error)
      setIsListening(false)
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `🎤 Speech recognition error: ${event.error}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      console.log('🎤 Speech recognition ended')
      
      // Restart listening automatically for continuous interaction
      if (isListening) {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start()
          }
        }, 100)
      }
    }

    recognitionRef.current.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Process speech input immediately for live interaction
  const processSpeechInput = async (transcript: string) => {
    console.log('🎤 Processing speech input:', transcript)
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: transcript,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    
    // Show processing indicator
    setIsLoading(true)
    
    try {
      let response: { content: string; sources?: string[]; confidence?: number }
      
      if (useNovaSonic) {
        response = await generateNovaResponse(transcript)
      } else {
        response = {
          content: generateMockResponse(transcript),
          sources: [],
          confidence: 0.8
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence
      }

      setMessages((prev) => [...prev, assistantMessage])
      
      // Auto-speak the response for live interaction
      speakText(response.content)
      
    } catch (error) {
      console.error('Error processing speech input:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error processing your speech. Please try again.",
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Speech synthesis functions for live interaction
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.log('Speech synthesis not supported in this browser')
      return
    }

    // Stop any ongoing speech for immediate response
    if (synthesisRef.current) {
      speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Optimize for live conversation
    utterance.rate = 1.0  // Slightly faster for natural conversation
    utterance.pitch = 1.0
    utterance.volume = 0.9
    utterance.lang = 'en-US'

    utterance.onstart = () => {
      setIsSpeaking(true)
      console.log('🔊 Live speech synthesis started')
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      console.log('🔊 Live speech synthesis ended')
      
      // Continue listening after speaking (for continuous conversation)
      if (isListening && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start()
          } catch (error) {
            console.log('Speech recognition restart failed:', error)
          }
        }, 500) // Small delay to avoid overlap
      }
    }

    utterance.onerror = (event) => {
      console.error('🔊 Speech synthesis error:', event.error)
      setIsSpeaking(false)
    }

    synthesisRef.current = utterance
    speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Cleanup effect for speech recognition
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
    <Card className="h-[700px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            Nova Sonic AI Assistant
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseNovaSonic(!useNovaSonic)}
              className={`text-xs ${useNovaSonic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
            >
              {useNovaSonic ? 'Nova Sonic ON' : 'Nova Sonic OFF'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          {isListening 
            ? "🎤 Live speech-to-speech mode active - Speak naturally!" 
            : useNovaSonic 
              ? "Powered by AWS Nova Sonic with RAG from S3 reports" 
              : "Ask questions about the analysis results"
          }
        </CardDescription>
        {selectedReport && (
          <div className="flex items-center space-x-2 pt-2">
            <FileVideo className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">Analyzing: {selectedReport.fileName}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {message.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`inline-block p-3 rounded-lg max-w-[85%] ${
                      message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <p key={index} className="text-xs text-gray-500 truncate">{source}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {message.role === "assistant" && message.confidence && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          Confidence: {Math.round(message.confidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(message.content)}
                        disabled={isSpeaking}
                        className="h-6 w-6 p-0"
                      >
                        {isSpeaking ? <Volume2 className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-full bg-muted text-muted-foreground">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <div className="inline-block p-3 rounded-lg bg-muted">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm text-muted-foreground">Analyzing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <div className="flex space-x-2">
            <Input
              placeholder={
                isListening 
                  ? "🎤 Listening... Speak naturally!" 
                  : useNovaSonic 
                    ? "Ask Nova Sonic about the reports or click Live to speak..." 
                    : "Ask about the analysis or click Live to speak..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || isListening}
              className={`flex-1 ${isListening ? 'bg-blue-50 border-blue-300' : ''}`}
            />
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              className={isListening ? "animate-pulse bg-red-500 hover:bg-red-600" : ""}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isListening ? " Stop" : " Live"}
            </Button>
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 bg-transparent"
                onClick={() => setInputValue("Explain the confidence scores")}
                disabled={isLoading}
              >
                Confidence scores
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 bg-transparent"
                onClick={() => setInputValue("What evidence is available?")}
                disabled={isLoading}
              >
                Evidence clips
              </Button>
              {useNovaSonic && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 bg-transparent"
                  onClick={() => setInputValue("Summarize the latest report")}
                  disabled={isLoading}
                >
                  Summarize report
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isSpeaking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                  className="text-xs h-6"
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSpeaking(!isSpeaking)}
                className={`text-xs h-6 ${isSpeaking ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
              >
                {isSpeaking ? 'Auto-speak ON' : 'Auto-speak OFF'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
