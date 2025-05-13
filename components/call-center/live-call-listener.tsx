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
  const [conferenceName, setConferenceName] = useState<string | null>(null)
  const connectionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const deviceRef = useRef<any>(null)

  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]}: ${info}`])
    console.log(`[LiveCallListener] ${info}`)
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

  // Step 1: Set up the conference
  const setupConference = async () => {
    try {
      addDebugInfo(`Requesting to listen to call ${callDetailId}...`)
      const response = await fetch(`/api/calls/${callDetailId}/listen`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      addDebugInfo(`Received conference name: ${data.conferenceName}`)
      addDebugInfo(`Call SID: ${data.callSid}`)
      addDebugInfo(`Call status: ${data.status}`)
      if (data.contactName) {
        addDebugInfo(`Contact name: ${data.contactName}`)
      }

      setConferenceName(data.conferenceName)
      return data.conferenceName
    } catch (error) {
      addDebugInfo(`Error setting up conference: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Step 2: Get a Twilio token
  const getTwilioToken = async () => {
    try {
      addDebugInfo("Requesting Twilio token...")
      const tokenResponse = await fetch("/api/twilio/client-token")
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Server returned ${tokenResponse.status}: ${tokenResponse.statusText}`)
      }

      const { token, identity } = await tokenResponse.json()
      addDebugInfo(`Received token for identity: ${identity}`)
      return { token, identity }
    } catch (error) {
      addDebugInfo(`Error getting token: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Step 3: Initialize Twilio Device
  const initializeTwilioDevice = async (token: string) => {
    try {
      addDebugInfo("Initializing Twilio Device...")
      if (!window.Twilio) {
        throw new Error("Twilio Client SDK not loaded yet")
      }

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

      device.on("error", (deviceError: any) => {
        console.error("Twilio device error:", deviceError)
        addDebugInfo(`Device error: ${deviceError.message || "Unknown error"}`)
        setError(`Device error: ${deviceError.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnecting(false)
        setIsConnected(false)
      })

      // Wait for device to be ready
      return new Promise<any>((resolve, reject) => {
        const readyHandler = () => {
          device.removeListener("ready", readyHandler)
          resolve(device)
        }

        const errorHandler = (err: any) => {
          device.removeListener("error", errorHandler)
          reject(err)
        }

        device.on("ready", readyHandler)
        device.on("error", errorHandler)

        // Also resolve if device is already ready
        if (device.state === "ready") {
          resolve(device)
        }

        // Timeout after 10 seconds
        setTimeout(() => {
          device.removeListener("ready", readyHandler)
          device.removeListener("error", errorHandler)
          reject(new Error("Timeout waiting for device to be ready"))
        }, 10000)
      })
    } catch (error) {
      addDebugInfo(`Error initializing device: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Step 4: Connect to the conference
  const connectToConference = async (device: any, confName: string, identity: string) => {
    try {
      addDebugInfo(`Connecting to conference: ${confName}...`)

      // Make the connection parameters
      const connectionParams = {
        conferenceName: confName,
        clientIdentity: identity,
        muted: true,
      }

      addDebugInfo(`Connection params: ${JSON.stringify(connectionParams)}`)

      // Connect to the conference
      const connection = await device.connect({ params: connectionParams })

      addDebugInfo("Connection initiated")

      // Set up event handlers
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

      connection.on("error", (connectionError: any) => {
        console.error("Connection error:", connectionError)
        addDebugInfo(`Connection error: ${connectionError.message || "Unknown error"}`)
        setError(`Connection error: ${connectionError.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnected(false)
        setIsConnecting(false)
      })

      return connection
    } catch (error) {
      addDebugInfo(`Error connecting to conference: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Connect to the live call - main function that orchestrates the process
  const connectToCall = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      setStatus("Connecting to call...")
      addDebugInfo("Starting connection process...")

      if (!sdkLoaded || !window.Twilio) {
        throw new Error("Twilio Client SDK not loaded yet. Please wait a moment and try again.")
      }

      // Step 1: Set up the conference
      const confName = await setupConference()

      // Step 2: Get a Twilio token
      const { token, identity } = await getTwilioToken()

      // Step 3: Initialize Twilio Device
      const device = await initializeTwilioDevice(token)
      deviceRef.current = device

      // Step 4: Connect to the conference
      const connection = await connectToConference(device, confName, identity)
      connectionRef.current = connection
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

  // Test direct TwiML
  const testDirectTwiML = async () => {
    try {
      if (!conferenceName) {
        throw new Error("No conference name available")
      }

      addDebugInfo("Testing direct TwiML access...")

      // Make a direct request to the join-conference endpoint
      const response = await fetch("/api/twilio/join-conference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conferenceName,
          clientIdentity: "test-client",
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        addDebugInfo(`Direct TwiML test failed: ${response.status} ${response.statusText}`)
        addDebugInfo(`Response: ${text}`)
        throw new Error(`Failed to access TwiML: ${response.status} ${response.statusText}`)
      }

      const twiml = await response.text()
      addDebugInfo("Direct TwiML test successful")
      addDebugInfo(`TwiML: ${twiml.substring(0, 100)}...`)

      toast.success("TwiML endpoint is accessible")
    } catch (error) {
      addDebugInfo(`TwiML test error: ${error instanceof Error ? error.message : "Unknown error"}`)
      toast.error(`TwiML test failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
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

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button variant="outline" size="sm" onClick={testDirectTwiML} className="flex-1">
            Test TwiML
          </Button>
        </div>

        {/* Debug Information (collapsible) */}
        <div className="mt-4">
          <details className="text-xs" open>
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
