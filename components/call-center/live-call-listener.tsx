"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { PhoneIcon, PhoneOffIcon, Volume2Icon, VolumeXIcon, AlertCircleIcon } from "lucide-react"
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
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const connectionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const deviceRef = useRef<any>(null)

  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]}: ${info}`])
  }

  // Load Twilio Client JS SDK
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Twilio) {
      addDebugInfo("Loading Twilio Client SDK...")
      const script = document.createElement("script")
      script.src = "//sdk.twilio.com/js/client/releases/1.14.0/twilio.js"
      script.async = true
      script.onload = () => {
        addDebugInfo("Twilio Client SDK loaded successfully")
        setSdkLoaded(true)
      }
      script.onerror = () => {
        addDebugInfo("Failed to load Twilio Client SDK")
        setError("Failed to load Twilio Client SDK. Please check your internet connection and try again.")
      }
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    } else if (window.Twilio) {
      addDebugInfo("Twilio Client SDK already loaded")
      setSdkLoaded(true)
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
      addDebugInfo("Starting connection process...")

      if (!sdkLoaded || !window.Twilio) {
        throw new Error("Twilio Client SDK not loaded yet. Please wait a moment and try again.")
      }

      // Get a token from our server
      addDebugInfo("Requesting Twilio token...")
      const tokenResponse = await fetch("/api/twilio/client-token")
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        throw new Error(`Failed to get Twilio token: ${errorData.error || tokenResponse.statusText}`)
      }

      const { token, identity } = await tokenResponse.json()
      addDebugInfo(`Received token for identity: ${identity}`)

      // Initialize Twilio Device with debug enabled
      addDebugInfo("Initializing Twilio Device...")
      const device = new window.Twilio.Device(token, {
        codecPreferences: ["opus", "pcmu"],
        fakeLocalDTMF: true,
        enableRingingState: true,
        debug: true,
      })

      device.on("ready", () => {
        addDebugInfo("Twilio Device is ready")
        setStatus("Device ready to connect")
      })

      device.on("error", (error: any) => {
        console.error("Twilio device error:", error)
        addDebugInfo(`Device error: ${error.message || "Unknown error"}`)
        setError(`Device error: ${error.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnecting(false)
        setIsConnected(false)
      })

      // Store the device in a ref
      deviceRef.current = device

      // Request to join the conference
      addDebugInfo(`Requesting to listen to call ${callDetailId}...`)
      const response = await fetch(`/api/calls/${callDetailId}/listen`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to initiate live listening")
      }

      const { conferenceName } = await response.json()
      addDebugInfo(`Received conference name: ${conferenceName}`)

      // Connect to the conference
      addDebugInfo("Connecting to conference...")
      const connection = await device.connect({
        params: {
          conferenceName,
          clientIdentity: identity,
          muted: true, // Start muted
        },
      })

      connectionRef.current = connection
      addDebugInfo("Connection initiated")

      connection.on("accept", () => {
        addDebugInfo("Connection accepted")
        setIsConnected(true)
        setIsConnecting(false)
        setStatus("Connected")
        toast.success("Connected to live call")
      })

      connection.on("disconnect", () => {
        addDebugInfo("Connection disconnected")
        setIsConnected(false)
        setStatus("Disconnected")
        toast.info("Disconnected from call")
      })

      connection.on("error", (error: any) => {
        console.error("Connection error:", error)
        addDebugInfo(`Connection error: ${error.message || "Unknown error"}`)
        setError(`Connection error: ${error.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnected(false)
        setIsConnecting(false)
      })
    } catch (error) {
      console.error("Error connecting to call:", error)
      addDebugInfo(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setStatus("Failed to connect")
      setIsConnecting(false)
      toast.error("Failed to connect to live call")
    }
  }

  // Disconnect from the call
  const disconnectCall = () => {
    try {
      addDebugInfo("Disconnecting from call...")
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
      addDebugInfo("Successfully disconnected")
    } catch (error) {
      console.error("Error disconnecting:", error)
      addDebugInfo(`Error disconnecting: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (connectionRef.current) {
      if (isMuted) {
        connectionRef.current.mute(false)
        addDebugInfo("Unmuted connection")
      } else {
        connectionRef.current.mute(true)
        addDebugInfo("Muted connection")
      }
      setIsMuted(!isMuted)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    addDebugInfo(`Volume set to ${value[0]}`)
    // Implement volume control if the Twilio SDK supports it
    // This might require custom audio handling
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectCall()
    }
  }, [])

  // Retry connection
  const retryConnection = () => {
    if (deviceRef.current) {
      deviceRef.current.destroy()
      deviceRef.current = null
    }
    setError(null)
    setDebugInfo([])
    connectToCall()
  }

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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
              <div className="flex items-start">
                <AlertCircleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  <p className="text-xs text-red-700 mt-1">Please check your Twilio configuration and try again.</p>
                </div>
              </div>
            </div>
          )}
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
            error ? (
              <Button onClick={retryConnection} className="w-full">
                <PhoneIcon className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
            ) : (
              <Button onClick={connectToCall} disabled={isConnecting || !sdkLoaded} className="w-full">
                <PhoneIcon className="mr-2 h-4 w-4" />
                {isConnecting ? "Connecting..." : "Listen to Call"}
              </Button>
            )
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

        {/* Debug Information (collapsible) */}
        <div className="mt-4">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Debug Information</summary>
            <div className="mt-2 p-2 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words">
                {debugInfo.map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </pre>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  )
}
