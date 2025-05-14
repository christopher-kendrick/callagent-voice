"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, UserIcon, Trash, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Create a fallback contact list component instead of using the problematic package
export function ContactListWrapper() {
  const { data: session } = useSession()
  const userId = session?.user?.id || ""
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<any[]>([])

  // Fetch contacts
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    // Fetch contacts from your API
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => {
        setContacts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching contacts:", err)
        setError("Failed to load contacts. Please try again later.")
        setLoading(false)
      })
  }, [userId])

  // Handle contact click
  const handleContactClick = (contact: any) => {
    console.log("Click", contact)
  }

  // Handle contact edit
  const handleContactEdit = (contact: any) => {
    console.log("Edit", contact)
  }

  // Handle contact delete
  const handleContactDelete = (contact: any) => {
    console.log("Delete", contact)
    // You would typically call your API to delete the contact here
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!userId) {
    return <div className="text-center py-4 text-gray-500">Please sign in to view your contacts</div>
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Contacts</h2>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No contacts found. Add your first contact to get started.</div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:bg-gray-50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={() => handleContactClick(contact)}
                  >
                    <div className="bg-gray-100 p-2 rounded-full">
                      <UserIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-gray-500">{contact.phone}</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleContactEdit(contact)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleContactDelete(contact)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
