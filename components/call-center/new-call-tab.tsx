"use client"

import { useState } from "react"
import { PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Contact, Script } from "@/lib/db/schema"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface NewCallTabProps {
  contacts: Contact[]
  scripts: Script[]
  loading: boolean
  onCallInitiated: () => void
}

export function NewCallTab({ contacts, scripts, loading, onCallInitiated }: NewCallTabProps) {
  const router = useRouter()
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [selectedScript, setSelectedScript] = useState<number | null>(null)
  const [initiatingCall, setInitiatingCall] = useState(false)

  const handleContactToggle = (contactId: number) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const handleSelectAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map((contact) => contact.id))
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

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptId: selectedScript,
          contactIds: selectedContacts,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Calls initiated successfully")
        onCallInitiated()
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
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                  onCheckedChange={handleSelectAllContacts}
                />
                <Label htmlFor="selectAll">Select All</Label>
              </div>
              <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-md border p-4">
                {contacts.map((contact) => (
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
                {selectedContacts.length} of {contacts.length} contacts selected
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Script</CardTitle>
          <CardDescription>Choose a script for the AI agent</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading scripts...</div>
          ) : scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No scripts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Select onValueChange={(value) => setSelectedScript(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a script" />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((script) => (
                    <SelectItem key={script.id} value={script.id.toString()}>
                      {script.title}
                      {script.isTemplate ? " (Template)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedScript && (
                <div className="rounded-md border p-4">
                  <h4 className="mb-2 font-medium">{scripts.find((s) => s.id === selectedScript)?.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {scripts.find((s) => s.id === selectedScript)?.content}
                  </p>
                </div>
              )}
            </div>
          )}
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
