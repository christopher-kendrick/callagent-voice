"use client"

import { useSession } from "next-auth/react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

// Dynamically import the ContactList component with no SSR
const ContactList = dynamic(() => import("@coogichrisla/contact-elements").then((mod) => mod.ContactList), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  ),
})

export function ContactListWrapper() {
  const { data: session } = useSession()
  const userId = session?.user?.id || ""
  const [error, setError] = useState<string | null>(null)

  // Handle component errors
  const handleError = (err: any) => {
    console.error("Contact list error:", err)
    setError("There was an error loading the contact list. Please try again later.")
  }

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Contacts</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {userId ? (
        <div onError={handleError}>
          {/* Wrap in error boundary */}
          <ContactList
            userId={userId}
            onContactClick={(contact) => console.log("Click", contact)}
            onContactEdit={(contact) => console.log("Edit", contact)}
            onContactDelete={(contact) => console.log("Delete", contact)}
          />
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">Please sign in to view your contacts</div>
      )}
    </div>
  )
}
