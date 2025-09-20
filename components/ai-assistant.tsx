"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, User, Send, Loader2, FileVideo } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
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
        "Hello! I'm your AI assistant for video analysis. I can help you understand the findings, explain technical details, or answer questions about the analysis results. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Mock AI responses based on common questions
  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()

    if (message.includes("confidence") || message.includes("accuracy")) {
      return `The confidence scores in this analysis range from 78% to 95%. These scores are calculated based on multiple factors including object detection accuracy, motion pattern recognition, and environmental conditions. Higher confidence scores (>90%) indicate very reliable detections, while scores between 70-90% are still actionable but may require additional review.`
    }

    if (message.includes("speed") || message.includes("violation")) {
      return `The speed violation detected at timestamp 00:03:45 shows a vehicle exceeding the posted speed limit by approximately 15-20 mph. This was determined through frame-by-frame analysis of vehicle movement relative to road markers and known distances. The 95% confidence indicates this is a highly reliable detection.`
    }

    if (message.includes("lane") || message.includes("change")) {
      return `The lane change incident at 00:08:12 was flagged due to insufficient signaling time and proximity to other vehicles. The system detected the vehicle crossed lane markings without maintaining the required 3-second signal duration before changing lanes.`
    }

    if (message.includes("evidence") || message.includes("clip")) {
      return `Evidence clips are automatically generated for each incident, showing 10 seconds before and after the detected event. These clips can be exported for court proceedings and include metadata such as GPS coordinates, timestamp, and confidence scores.`
    }

    if (message.includes("location") || message.includes("gps")) {
      return `The analysis shows this incident occurred on Highway 101 at Mile Marker 45. GPS coordinates and road conditions are automatically logged. Weather conditions were clear with good visibility at the time of recording.`
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
    return `I understand you're asking about "${userMessage}". Based on the current analysis of ${selectedReport?.fileName || "this video"}, I can provide more specific information. Could you clarify what particular aspect you'd like me to explain? For example, you could ask about confidence scores, specific incidents, or technical details.`
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

    // Simulate AI processing delay
    setTimeout(
      () => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: generateResponse(userMessage.content),
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)
      },
      1000 + Math.random() * 2000,
    )
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

  return (
    <Card className="h-[700px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Bot className="h-5 w-5 mr-2 text-primary" />
          AI Assistant
        </CardTitle>
        <CardDescription>Ask questions about the analysis results</CardDescription>
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
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
              placeholder="Ask about the analysis..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
