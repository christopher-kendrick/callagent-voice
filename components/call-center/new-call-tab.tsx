"use client"

import { useState, useEffect } from "react"
import { PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Define explicit types with defaults
interface Contact {
  id: number
  name: string
  phoneNumber: string
  [key: string]: any
}

interface Script {
  id: number
  title: string
  content: string
  isTemplate?: boolean
  [key: string]: any
}

interface Config {
  id: number
  name: string
  humeConfigId: string
  [key: string]: any
}

interface NewCallTabProps {
  contacts?: Contact[]
  scripts?: Script[]
  loading?: boolean
  onCallInitiated?: () => void
}

export function NewCallTab({
  contacts = [],
  scripts = [],
  loading = false,
  onCallInitiated = () => {},
}: NewCallTabProps) {
  const router = useRouter()
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [selectedScript, setSelectedScript] = useState<number | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)
  const [initiatingCall, setInitiatingCall] = useState(false)
  const [configs, setConfigs] = useState<Config[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)

  // Safely access arrays with fallbacks
  const safeContacts = Array.isArray(contacts) ? contacts : []
  const safeScripts = Array.isArray(scripts) ? scripts : []

  // Fetch configurations when component mounts
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setLoadingConfigs(true)
        const response = await fetch("/api/configs")
        if (response.ok) {
          const data = await response.json()
          setConfigs(Array.isArray(data.configs) ? data.configs : [])
        } else {
          console.error("Failed to fetch configurations")
          setConfigs([])
        }
      } catch (error) {
        console.error("Error fetching configurations:", error)
        setConfigs([])
      } finally {
        setLoadingConfigs(false)
      }
    }

    fetchConfigs()
  }, [])

  const handleContactToggle = (contactId: number) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const handleSelectAllContacts = () => {
    if (selectedContacts.length === safeContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(safeContacts.map((contact) => contact.id))
    }
  }

  const handleInitiateCall = async () => {
    if (!selectedScript) {
      toast.error("Please select a script")
      return
    }

    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact")
      return
    }

    try {
      setInitiatingCall(true)

      const payload: any = {
        scriptId: selectedScript,
        contactIds: selectedContacts,
      }

      // Add configuration ID if selected
      if (selectedConfig) {
        payload.configId = selectedConfig
      }

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Calls initiated successfully")
        if (onCallInitiated) onCallInitiated()
        router.push(`/dashboard/calls/${data.callRecordId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to initiate calls")
      }
    } catch (error) {
      console.error("Error initiating calls:", error)
      toast.error("An error occurred while initiating calls")
    } finally {
      setInitiatingCall(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Select Contacts</CardTitle>
          <CardDescription>Choose contacts to call</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading contacts...</div>
          ) : safeContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={safeContacts.length > 0 && selectedContacts.length === safeContacts.length}
                  onCheckedChange={handleSelectAllContacts}
                />
                <Label htmlFor="selectAll">Select All</Label>
              </div>
              <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-md border p-4">
                {safeContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contact-${contact.id}`}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleContactToggle(contact.id)}
                    />
                    <Label htmlFor={`contact-${contact.id}`} className="flex flex-1 justify-between">
                      <span>{contact.name}</span>
                      <span className="text-sm text-muted-foreground">{contact.phoneNumber}</span>
                    </Label>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedContacts.length} of {safeContacts.length} contacts selected
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Settings</CardTitle>
          <CardDescription>Configure your call settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Script Selection */}
            <div className="space-y-2">
              <Label htmlFor="script">Select Script</Label>
              <Select onValueChange={(value) => setSelectedScript(Number(value))}>
                <SelectTrigger id="script">
                  <SelectValue placeholder="Select a script" />
                </SelectTrigger>
                <SelectContent>
                  {safeScripts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No scripts available
                    </SelectItem>
                  ) : (
                    safeScripts.map((script) => (
                      <SelectItem key={script.id} value={script.id.toString()}>
                        {script.title}
                        {script.isTemplate ? " (Template)" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Display selected script */}
            {selectedScript && (
              <div className="rounded-md border p-4">
                <h4 className="mb-2 font-medium">
                  {safeScripts.find((s) => s.id === selectedScript)?.title || "Selected Script"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {safeScripts.find((s) => s.id === selectedScript)?.content || "No content available"}
                </p>
              </div>
            )}

            {/* Configuration Selection */}
            <div className="space-y-2 pt-4">
              <Label htmlFor="config">Hume Configuration (Optional)</Label>
              <Select onValueChange={(value) => setSelectedConfig(value === "none" ? null : value)}>
                <SelectTrigger id="config">
                  <SelectValue placeholder="Select a configuration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default Configuration</SelectItem>
                  {loadingConfigs ? (
                    <SelectItem value="loading" disabled>
                      Loading configurations...
                    </SelectItem>
                  ) : configs.length === 0 ? (
                    <SelectItem value="no-configs" disabled>
                      No configurations available
                    </SelectItem>
                  ) : (
                    configs
                      .filter((config) => config.humeConfigId)
                      .map((config) => (
                        <SelectItem key={config.id} value={config.humeConfigId}>
                          {config.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A configuration determines the voice, language model, and behavior of the AI agent
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            size="lg"
            onClick={handleInitiateCall}
            disabled={loading || initiatingCall || selectedContacts.length === 0 || !selectedScript}
          >
            {initiatingCall ? (
              "Initiating Calls..."
            ) : (
              <>
                <PhoneIcon className="mr-2 h-4 w-4" />
                Start Calls ({selectedContacts.length})
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
