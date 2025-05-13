"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, RefreshCwIcon, PlayIcon, PauseIcon, Volume2Icon, VolumeXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CallRecordDetailsProps {
  callRecord: any // Using any for simplicity, but you should define a proper type
}

interface AudioPlayerProps {
  recordingUrl: string
  className?: string
}

function AudioPlayer({ recordingUrl, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)

  useEffect(() => {
    // Extract the recording ID from the Twilio URL
    const recordingIdMatch = recordingUrl.match(/\/Recordings\/([A-Za-z0-9]+)/)
    if (recordingIdMatch && recordingIdMatch[1]) {
      const recordingId = recordingIdMatch[1]
      setProxyUrl(`/api/recordings/${recordingId}`)
      setIsLoading(false)
    } else {
      setError("Invalid recording URL format")
      setIsLoading(false)
    }
  }, [recordingUrl])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch((err) => {
          console.error("Error playing audio:", err)
          setError("Failed to play recording. Please try again.")
          toast.error("Failed to play recording. Please try again.")
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setIsLoading(false)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error("Audio error:", e)
    setError("Failed to load recording. Please try again.")
    setIsLoading(false)
    toast.error("Failed to load recording. Please try again.")
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.volume = value[0]
      setVolume(value[0])
      if (value[0] === 0) {
        setIsMuted(true)
        audioRef.current.muted = true
      } else if (isMuted) {
        setIsMuted(false)
        audioRef.current.muted = false
      }
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading recording...</div>
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>
  }

  return (
    <div className={cn("space-y-2", className)}>
      {proxyUrl && (
        <audio
          ref={audioRef}
          src={proxyUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          className="hidden"
        />
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSliderChange}
            className="flex-1"
            aria-label="Playback progress"
          />
          <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <VolumeXIcon className="h-4 w-4" /> : <Volume2Icon className="h-4 w-4" />}
        </Button>

        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-20"
          aria-label="Volume"
        />
      </div>
    </div>
  )
}

export function CallRecordDetails({ callRecord }: CallRecordDetailsProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [activeRecording, setActiveRecording] = useState<string | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/calls/${callRecord.id}`)
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error refreshing call record:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "in-progress":
      case "ringing":
      case "queued":
      case "initiated":
        return <Badge variant="secondary">In Progress</Badge>
      case "completed":
      case "answered":
        return <Badge variant="success">Completed</Badge>
      case "failed":
      case "busy":
      case "no-answer":
      case "canceled":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1">
          <RefreshCwIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call Record #{callRecord.id}</CardTitle>
          <CardDescription>Created on {new Date(callRecord.createdAt).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <div className="mt-1">{getStatusBadge(callRecord.status)}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Script</h3>
                <div className="mt-1">{callRecord.script?.title || "N/A"}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Contact Count</h3>
                <div className="mt-1">{callRecord.callDetails?.length || 0}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Start Time</h3>
                <div className="mt-1">
                  {callRecord.startTime ? new Date(callRecord.startTime).toLocaleString() : "Not started"}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">End Time</h3>
                <div className="mt-1">
                  {callRecord.endTime ? new Date(callRecord.endTime).toLocaleString() : "In progress"}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                <div className="mt-1">
                  {callRecord.startTime && callRecord.endTime
                    ? `${Math.round(
                        (new Date(callRecord.endTime).getTime() - new Date(callRecord.startTime).getTime()) / 1000 / 60,
                      )} minutes`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Script Content</h3>
            <div className="rounded-md border p-4">
              <p className="whitespace-pre-wrap">{callRecord.script?.content || "No script content available"}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Call Details</h3>
            {callRecord.callDetails?.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callRecord.callDetails.map((detail: any) => (
                      <TableRow key={detail.id}>
                        <TableCell className="font-medium">{detail.contact?.name || "Unknown"}</TableCell>
                        <TableCell>{detail.contact?.phoneNumber || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(detail.status)}</TableCell>
                        <TableCell>
                          {detail.startTime ? new Date(detail.startTime).toLocaleString() : "Not started"}
                        </TableCell>
                        <TableCell>{detail.duration ? `${detail.duration} seconds` : "N/A"}</TableCell>
                        <TableCell>
                          {detail.recordingUrl ? (
                            <div className="space-y-2">
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  setActiveRecording(
                                    activeRecording === detail.recordingUrl ? null : detail.recordingUrl,
                                  )
                                }
                                className="p-0 h-auto"
                              >
                                {activeRecording === detail.recordingUrl ? "Hide Player" : "Listen"}
                              </Button>
                              {activeRecording === detail.recordingUrl && (
                                <AudioPlayer recordingUrl={detail.recordingUrl} />
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex justify-center py-8 text-muted-foreground">No call details available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
