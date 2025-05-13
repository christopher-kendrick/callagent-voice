"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { PhoneIcon, PhoneOffIcon, Volume2Icon, VolumeXIcon, AlertCircleIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  // Client-side only state
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
  const [audioDetected, setAudioDetected] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  // Use refs for values that shouldn't trigger re-renders
  const connectionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const deviceRef = useRef<any>(null)
  const audioLevelTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Use a ref to track if component is mounted (client-side only)
  const isMounted = useRef(false)

  // Helper function to add debug info
  const addDebugInfo = useCallback((info: string) => {
    if (!isMounted.current) return

    setDebugInfo((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]}: ${info}`])
    console.log(`[LiveCallListener] ${info}`)
  }, [])

  // Set mounted flag on client-side only
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Load Twilio Client JS SDK - client-side only
  useEffect(() => {
    // Skip during SSR
    if (typeof window === "undefined") return

    if (!window.Twilio) {
      addDebugInfo("Loading Twilio Client SDK...")
      const script = document.createElement("script")
      script.src = "//sdk.twilio.com/js/client/releases/1.14.0/twilio.js"
      script.async = true
      script.onload = () => {
        if (isMounted.current) {
          addDebugInfo("Twilio Client SDK loaded successfully")
          setSdkLoaded(true)
        }
      }
      script.onerror = () => {
        if (isMounted.current) {
          addDebugInfo("Failed to load Twilio Client SDK")
          setError("Failed to load Twilio Client SDK. Please check your internet connection and try again.")
        }
      }
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    } else if (isMounted.current) {
      addDebugInfo("Twilio Client SDK already loaded")
      setSdkLoaded(true)
    }
  }, [addDebugInfo])

  // Initialize timer for connected call - client-side only
  useEffect(() => {
    // Skip during SSR
    if (typeof window === "undefined") return

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

  // Monitor audio levels to detect if audio is being received - client-side only
  const startAudioLevelMonitoring = useCallback(() => {
    // Skip during SSR
    if (typeof window === "undefined") return

    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current)
    }

    let silentSeconds = 0
    audioLevelTimerRef.current = setInterval(() => {
      if (!isMounted.current) return

      if (connectionRef.current) {
        try {
          // Check if status method exists and call it
          const isOpen =
            typeof connectionRef.current.status === "function" ? connectionRef.current.status() === "open" : true

          if (isOpen) {
            // Get the current input and output volumes if available
            const inputVolume =
              typeof connectionRef.current.inputVolume === "number" ? connectionRef.current.inputVolume : 0
            const outputVolume =
              typeof connectionRef.current.outputVolume === "number" ? connectionRef.current.outputVolume : 0

            addDebugInfo(`Audio levels - Input: ${inputVolume.toFixed(2)}, Output: ${outputVolume.toFixed(2)}`)

            // If we detect any output volume, mark audio as detected
            if (outputVolume > 0.01) {
              setAudioDetected(true)
              silentSeconds = 0
            } else {
              silentSeconds++

              // If we've been silent for more than 5 seconds, show a warning
              if (silentSeconds > 5 && !audioDetected) {
                addDebugInfo("No audio detected for 5 seconds")
              }
            }
          }
        } catch (error) {
          addDebugInfo(`Error monitoring audio levels: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }
    }, 1000)
  }, [addDebugInfo, audioDetected])

  // Stop monitoring audio levels
  const stopAudioLevelMonitoring = useCallback(() => {
    if (typeof window === "undefined") return

    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current)
      audioLevelTimerRef.current = null
    }
    setAudioDetected(false)
  }, [])

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
      if (data.callSid) {
        addDebugInfo(`Call SID: ${data.callSid}`)
      }
      if (data.status) {
        addDebugInfo(`Call status: ${data.callStatus}`)
      }
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

  // Step 3: Initialize Twilio Device with simplified event handling
  const initializeTwilioDevice = async (token: string) => {
    try {
      addDebugInfo("Initializing Twilio Device...")
      if (!window.Twilio) {
        throw new Error("Twilio Client SDK not loaded yet")
      }

      // Create a new device
      const device = new window.Twilio.Device(token, {
        codecPreferences: ["opus", "pcmu"],
        fakeLocalDTMF: true,
        enableRingingState: true,
        debug: true,
        audioConstraints: {
          optional: [],
        },
      })

      // Store the device in the ref
      deviceRef.current = device

      // Wait for device to be ready using a simpler approach
      return new Promise<any>((resolve, reject) => {
        // Define explicit function references for event handlers
        function onDeviceReady() {
          addDebugInfo("Device ready event fired")
          cleanup()
          resolve(device)
        }

        function onDeviceError(err: any) {
          addDebugInfo(`Device error event fired: ${err?.message || "Unknown error"}`)
          cleanup()
          reject(err || new Error("Unknown device error"))
        }

        function cleanup() {
          // Clear the timeout
          if (timeoutId) clearTimeout(timeoutId)

          // Remove event listeners
          try {
            if (typeof device.removeListener === "function") {
              device.removeListener("ready", onDeviceReady)
              device.removeListener("error", onDeviceError)
            } else if (typeof device.off === "function") {
              device.off("ready", onDeviceReady)
              device.off("error", onDeviceError)
            }
          } catch (e) {
            addDebugInfo(`Error removing listeners: ${e instanceof Error ? e.message : "Unknown error"}`)
          }
        }

        // Add event listeners
        try {
          if (typeof device.on === "function") {
            device.on("ready", onDeviceReady)
            device.on("error", onDeviceError)
            addDebugInfo("Added device event listeners")
          } else {
            addDebugInfo("Device.on is not a function, cannot add listeners")
            reject(new Error("Device.on is not a function"))
            return
          }
        } catch (e) {
          addDebugInfo(`Error adding device listeners: ${e instanceof Error ? e.message : "Unknown error"}`)
          reject(e)
          return
        }

        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          addDebugInfo("Device ready timeout reached")
          cleanup()
          reject(new Error("Timeout waiting for device to be ready"))
        }, 10000)

        // Check if device is already ready
        if (device.state === "ready") {
          addDebugInfo("Device is already ready")
          cleanup()
          resolve(device)
        }
      })
    } catch (error) {
      addDebugInfo(`Error initializing device: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Step 4: Connect to the conference with simplified event handling
  const connectToConference = async (device: any, confName: string, identity: string) => {
    try {
      addDebugInfo(`Connecting to conference: ${confName}...`)

      // Make the connection parameters
      const connectionParams = {
        To: confName,
        From: identity,
      }

      // Log the exact parameters we're sending
      addDebugInfo(`Connection params: ${JSON.stringify(connectionParams)}`)

      // Connect to the conference - don't pass any additional params object
      const connection = await device.connect(connectionParams)
      addDebugInfo("Connection initiated")

      // Store the connection in the ref
      connectionRef.current = connection

      // Set up event handlers with explicit function references
      function onConnectionAccept() {
        addDebugInfo("Connection accepted")
        setIsConnected(true)
        setIsConnecting(false)
        setStatus("Connected")
        toast.success("Connected to live call")
        startAudioLevelMonitoring()
      }

      function onConnectionDisconnect() {
        addDebugInfo("Connection disconnected")
        setIsConnected(false)
        setStatus("Disconnected")
        toast.info("Disconnected from call")
        stopAudioLevelMonitoring()

        // Remove event listeners on disconnect
        try {
          if (typeof connection.removeListener === "function") {
            connection.removeListener("accept", onConnectionAccept)
            connection.removeListener("disconnect", onConnectionDisconnect)
            connection.removeListener("error", onConnectionError)
          } else if (typeof connection.off === "function") {
            connection.off("accept", onConnectionAccept)
            connection.off("disconnect", onConnectionDisconnect)
            connection.off("error", onConnectionError)
          }
        } catch (e) {
          addDebugInfo(`Error removing connection listeners: ${e instanceof Error ? e.message : "Unknown error"}`)
        }
      }

      function onConnectionError(err: any) {
        addDebugInfo(`Connection error: ${err?.message || "Unknown error"}`)
        setError(`Connection error: ${err?.message || "Unknown error"}`)
        setStatus("Error")
        setIsConnected(false)
        setIsConnecting(false)
        stopAudioLevelMonitoring()
      }

      // Add event listeners
      try {
        if (typeof connection.on === "function") {
          connection.on("accept", onConnectionAccept)
          connection.on("disconnect", onConnectionDisconnect)
          connection.on("error", onConnectionError)
          addDebugInfo("Added connection event listeners")
        } else {
          addDebugInfo("Connection.on is not a function, cannot add listeners")
        }
      } catch (e) {
        addDebugInfo(`Error adding connection listeners: ${e instanceof Error ? e.message : "Unknown error"}`)
      }

      // Set up volume control
      if (typeof connection.volume === "function") {
        connection.volume(volume)
      }

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

      // Step 4: Connect to the conference
      await connectToConference(device, confName, identity)

      // Ensure we're not muted
      setIsMuted(false)
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
  const disconnectCall = useCallback(() => {
    try {
      addDebugInfo("Disconnecting from call...")
      stopAudioLevelMonitoring()

      if (connectionRef.current) {
        // Disconnect
        if (typeof connectionRef.current.disconnect === "function") {
          connectionRef.current.disconnect()
        }
        connectionRef.current = null
      }

      if (deviceRef.current) {
        // Destroy device
        if (typeof deviceRef.current.destroy === "function") {
          deviceRef.current.destroy()
        }
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
  }, [addDebugInfo, stopAudioLevelMonitoring])

  // Toggle mute
  const toggleMute = () => {
    if (connectionRef.current) {
      try {
        if (isMuted) {
          if (typeof connectionRef.current.mute === "function") {
            connectionRef.current.mute(false)
            addDebugInfo("Unmuted connection")
          }
        } else {
          if (typeof connectionRef.current.mute === "function") {
            connectionRef.current.mute(true)
            addDebugInfo("Muted connection")
          }
        }
        setIsMuted(!isMuted)
      } catch (error) {
        addDebugInfo(`Error toggling mute: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    addDebugInfo(`Volume set to ${newVolume}`)

    // Apply volume to the connection if it exists
    if (connectionRef.current) {
      try {
        if (typeof connectionRef.current.volume === "function") {
          connectionRef.current.volume(newVolume)
          addDebugInfo(`Applied volume ${newVolume} to connection`)
        }
      } catch (error) {
        addDebugInfo(`Error setting volume: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectCall()
    }
  }, [disconnectCall])

  // Retry connection
  const retryConnection = () => {
    disconnectCall()
    setError(null)
    setDebugInfo([])
    setAudioDetected(false)
    connectToCall()
  }

  // Create a test conference name if one doesn't exist
  const getTestConferenceName = () => {
    if (conferenceName) {
      return conferenceName
    }

    // Generate a test conference name
    const testConf = `test_conference_${Date.now()}`
    addDebugInfo(`Generated test conference name: ${testConf}`)
    setConferenceName(testConf)
    return testConf
  }

  // Test direct TwiML
  const testDirectTwiML = async () => {
    try {
      // Get a conference name (either existing or generated)
      const testConfName = getTestConferenceName()

      addDebugInfo(`Testing direct TwiML access with conference: ${testConfName}`)

      // Create a FormData object for the request
      const formData = new FormData()
      formData.append("conferenceName", testConfName)
      formData.append("clientIdentity", "test-client")

      addDebugInfo(`Form data created with conferenceName=${testConfName}`)

      // Make a direct request to the join-conference endpoint using form data
      const response = await fetch("/api/twilio/join-conference", {
        method: "POST",
        body: formData,
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

  // Test direct TwiML with JSON
  const testDirectTwiMLWithJSON = async () => {
    try {
      // Get a conference name (either existing or generated)
      const testConfName = getTestConferenceName()

      addDebugInfo(`Testing direct TwiML access with JSON: ${testConfName}`)

      // Make a direct request to the join-conference endpoint using JSON
      const response = await fetch("/api/twilio/join-conference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conferenceName: testConfName,
          clientIdentity: "test-client",
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        addDebugInfo(`Direct TwiML test with JSON failed: ${response.status} ${response.statusText}`)
        addDebugInfo(`Response: ${text}`)
        throw new Error(`Failed to access TwiML: ${response.status} ${response.statusText}`)
      }

      const twiml = await response.text()
      addDebugInfo("Direct TwiML test with JSON successful")
      addDebugInfo(`TwiML: ${twiml.substring(0, 100)}...`)

      toast.success("TwiML endpoint is accessible with JSON")
    } catch (error) {
      addDebugInfo(`TwiML test with JSON error: ${error instanceof Error ? error.message : "Unknown error"}`)
      toast.error(`TwiML test with JSON failed: ${error instanceof Error ? error.message : "Unknown error"}`)
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

          {conferenceName && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Conference:</span>
              <span className="text-sm truncate max-w-[200px]">{conferenceName}</span>
            </div>
          )}

          {isConnected && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Duration:</span>
              <span className="text-sm">{formatTime(elapsedTime)}</span>
            </div>
          )}

          {isConnected && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Audio Detected:</span>
              <Badge variant={audioDetected ? "success" : "destructive"}>{audioDetected ? "Yes" : "No"}</Badge>
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

        {isConnected && !audioDetected && elapsedTime > 5 && (
          <Alert variant="warning">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No audio detected</AlertTitle>
            <AlertDescription>
              We haven't detected any audio from the call. This could be because:
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li>The call might be on hold or muted</li>
                <li>There might be no active conversation</li>
                <li>There might be an issue with the audio routing</li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              >
                {showTroubleshooting ? "Hide Troubleshooting" : "Show Troubleshooting"}
              </Button>
              {showTroubleshooting && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Try these steps:</p>
                  <ol className="list-decimal pl-5 mt-1">
                    <li>Check if your browser's volume is turned up</li>
                    <li>Make sure the call is active and not on hold</li>
                    <li>Try disconnecting and reconnecting</li>
                    <li>Try using a different browser (Chrome works best)</li>
                    <li>Check if your computer's audio output is working</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

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
            Test Form
          </Button>
          <Button variant="outline" size="sm" onClick={testDirectTwiMLWithJSON} className="flex-1">
            Test JSON
          </Button>
        </div>

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
