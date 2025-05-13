"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { PhoneIcon, PhoneOffIcon, Volume2Icon, VolumeXIcon } from "lucide-react"
import { toast } from "sonner"

interface LiveCallListenerProps {
  callDetailId: number
  callSid?: string
  contactName?: string
  onClose: () => void
}

declare global {
  interface Window {
    Twilio: any
    twilioDevice: any
  }
}

export function LiveCallListener({ callDetailId, callSid, contactName, onClose }: LiveCallListenerProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [status, setStatus] = useState("Initializing...")
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const connectionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const deviceRef = useRef<any>(null)

  // Load Twilio Client JS SDK
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Twilio) {
      const script = document.createElement("script")
      script.src = "//sdk.twilio.com/js/client/releases/1.14.0/twilio.js"
      script.async = true
      script.onload = () => {
        console.log("Twilio Client SDK loaded")
      }
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Initialize timer for connected call
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setElapsedTime(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isConnected])

  // Format elapsed time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  // Connect to the live call
  const connectToCall = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      setStatus("Connecting to call...")

      if (!window.Twilio) {
        throw new Error("Twilio Client SDK not loaded")
      }

      // Get a token from our server
      const tokenResponse = await fetch("/api/twilio/client-token")
      if (!tokenResponse.ok) {
        throw new Error("Failed to get Twilio token")
      }

      const { token, identity } = await tokenResponse.json()

      // Initialize Twilio Device
      const device = new window.Twilio.Device(token, {
        codecPreferences: ["opus", "pcmu"],
        fakeLocalDTMF: true,
        enableRingingState: true,
      })

      device.on("ready", () => {
        setStatus("Ready to connect")
      })

      device.on("error", (error: any) => {
        console.error("Twilio device error:", error)
        setError(`Device error: ${error.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnecting(false)
        setIsConnected(false)
      })

      // Store the device in a ref
      deviceRef.current = device

      // Request to join the conference
      const response = await fetch(`/api/calls/${callDetailId}/listen`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to initiate live listening")
      }

      const { conferenceName } = await response.json()

      // Connect to the conference
      const connection = await device.connect({
        params: {
          conferenceName,
          muted: true, // Start muted
        },
      })

      connectionRef.current = connection

      connection.on("accept", () => {
        setIsConnected(true)
        setIsConnecting(false)
        setStatus("Connected")
        toast.success("Connected to live call")
      })

      connection.on("disconnect", () => {
        setIsConnected(false)
        setStatus("Disconnected")
        toast.info("Disconnected from call")
      })

      connection.on("error", (error: any) => {
        console.error("Connection error:", error)
        setError(`Connection error: ${error.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnected(false)
        setIsConnecting(false)
      })
    } catch (error) {
      console.error("Error connecting to call:", error)
      setError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setStatus("Failed to connect")
      setIsConnecting(false)
      toast.error("Failed to connect to live call")
    }
  }

  // Disconnect from the call
  const disconnectCall = () => {
    try {
      if (connectionRef.current) {
        connectionRef.current.disconnect()
        connectionRef.current = null
      }

      if (deviceRef.current) {
        deviceRef.current.destroy()
        deviceRef.current = null
      }

      setIsConnected(false)
      setIsConnecting(false)
      setStatus("Disconnected")
    } catch (error) {
      console.error("Error disconnecting:", error)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (connectionRef.current) {
      if (isMuted) {
        connectionRef.current.mute(false)
      } else {
        connectionRef.current.mute(true)
      }
      setIsMuted(!isMuted)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    // Implement volume control if the Twilio SDK supports it
    // This might require custom audio handling
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectCall()
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Live Call Listener</CardTitle>
        <Badge variant={isConnected ? "success" : isConnecting ? "secondary" : "outline"}>
          {isConnected ? "Connected" : isConnecting ? "Connecting" : "Disconnected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span className="text-sm">{status}</span>
          </div>

          {contactName && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Contact:</span>
              <span className="text-sm">{contactName}</span>
            </div>
          )}

          {callSid && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Call SID:</span>
              <span className="text-sm truncate max-w-[200px]">{callSid}</span>
            </div>
          )}

          {isConnected && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Duration:</span>
              <span className="text-sm">{formatTime(elapsedTime)}</span>
            </div>
          )}

          {error && <div className="text-sm text-destructive mt-2">{error}</div>}
        </div>

        {isConnected && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} disabled={!isConnected}>
                {isMuted ? <VolumeXIcon className="h-4 w-4" /> : <Volume2Icon className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  disabled={!isConnected}
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          {!isConnected ? (
            <Button onClick={connectToCall} disabled={isConnecting} className="w-full">
              <PhoneIcon className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Listen to Call"}
            </Button>
          ) : (
            <Button onClick={disconnectCall} variant="destructive" className="w-full">
              <PhoneOffIcon className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={onClose} className="w-full mt-2">
          Close
        </Button>
      </CardContent>
    </Card>
  )
}
