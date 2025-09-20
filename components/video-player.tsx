"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  RotateCcw,
  Settings,
  Download,
  Share,
  AlertTriangle,
  Clock,
  MapPin,
  Eye,
  Zap,
} from "lucide-react"

interface VideoPlayerProps {
  fileName: string
  findings: Array<{
    type: string
    severity: string
    timestamp: string
    confidence: number
    description: string
  }>
  onTimestampClick?: (timestamp: string) => void
}

export function VideoPlayer({ fileName, findings, onTimestampClick }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(932) // 15:32 in seconds
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Convert timestamp to seconds for timeline positioning
  const timestampToSeconds = (timestamp: string) => {
    const [minutes, seconds] = timestamp.split(":").map(Number)
    return minutes * 60 + seconds
  }

  // Convert seconds to timestamp format
  const secondsToTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Simulate video playback
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return duration
          }
          return prev + playbackSpeed
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration, playbackSpeed])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    setIsMuted(value[0] === 0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const jumpToIncident = (timestamp: string) => {
    const seconds = timestampToSeconds(timestamp)
    setCurrentTime(seconds)
    onTimestampClick?.(timestamp)
  }

  const getIncidentColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      default:
        return "bg-blue-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card className="glass-card border-0 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Video Display */}
          <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
            {/* Mock video placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <Play className="h-12 w-12 ml-1" />
                </div>
                <p className="text-lg font-semibold">{fileName}</p>
                <p className="text-sm text-white/70 mt-1">Dashcam Footage</p>
              </div>
            </div>

            {/* Incident Markers Overlay */}
            <div className="absolute bottom-20 left-4 right-4">
              <div className="relative h-2 bg-white/20 rounded-full">
                {/* Progress bar */}
                <div
                  className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />

                {/* Incident markers */}
                {findings.map((finding, index) => {
                  const position = (timestampToSeconds(finding.timestamp) / duration) * 100
                  return (
                    <div
                      key={index}
                      className={`absolute top-0 w-3 h-3 -mt-0.5 rounded-full cursor-pointer transform -translate-x-1/2 ${getIncidentColor(finding.severity)} hover:scale-125 transition-transform`}
                      style={{ left: `${position}%` }}
                      onClick={() => jumpToIncident(finding.timestamp)}
                      title={`${finding.type} at ${finding.timestamp}`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
              <Button
                variant="ghost"
                size="lg"
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </Button>
            </div>

            {/* Current Incident Indicator */}
            {selectedIncident !== null && (
              <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {findings[selectedIncident]?.type} - {findings[selectedIncident]?.confidence}% confidence
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Video Controls */}
          <div className="p-6 bg-white/80 backdrop-blur-sm">
            {/* Timeline */}
            <div className="mb-4">
              <Slider value={[currentTime]} max={duration} step={1} onValueChange={handleSeek} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{secondsToTimestamp(currentTime)}</span>
                <span>{secondsToTimestamp(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}>
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentTime(0)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-4">
                {/* Volume Control */}
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={toggleMute}>
                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>

                {/* Playback Speed */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="text-sm bg-transparent border border-border rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>

                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident Timeline */}
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            Incident Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {findings.map((finding, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedIncident === index
                    ? "bg-primary/10 border-primary/30"
                    : "bg-white/60 border-border hover:bg-white/80"
                }`}
                onClick={() => {
                  setSelectedIncident(index)
                  jumpToIncident(finding.timestamp)
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getIncidentColor(finding.severity)}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{finding.timestamp}</span>
                      <Badge variant="outline" className="text-xs">
                        {finding.confidence}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{finding.type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={finding.severity === "high" ? "destructive" : "secondary"} className="capitalize">
                    {finding.severity}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Tools */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-secondary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Export Video Segment
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Share className="h-4 w-4 mr-2" />
              Share Timestamp
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Flag for Review
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-accent" />
              Video Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{secondsToTimestamp(duration)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Resolution:</span>
              <span className="font-medium">1920x1080</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frame Rate:</span>
              <span className="font-medium">30 FPS</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">File Size:</span>
              <span className="font-medium">245.7 MB</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
