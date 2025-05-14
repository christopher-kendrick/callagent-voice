"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { Alert, AlertCircle, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ContactList as ContactListComponent } from "@coogichrisla/contact-elements"

export function ContactList() {
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)

  // Handle contact interactions
  const handleContactClick = (contact: any) => {
    console.log("Contact clicked:", contact)
    // Implement your contact click logic here
  }

  const handleContactEdit = (contact: any) => {
    console.log("Edit contact:", contact)
    // Implement your contact edit logic here
  }

  const handleContactDelete = (contact: any) => {
    console.log("Delete contact:", contact)
    // Implement your contact delete logic here
  }

  // Show loading state while session is loading
  if (status === "loading") {
    return <div className="p-4">Loading contacts...</div>
  }

  // Show sign-in message if not authenticated
  if (status === "unauthenticated") {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>Please sign in to view and manage your contacts.</AlertDescription>
      </Alert>
    )
  }

  // Show error message if there's an error
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="contact-list-wrapper">
      <ContactListComponent
        userId={session?.user?.id || ""}
        onContactClick={handleContactClick}
        onContactEdit={handleContactEdit}
        onContactDelete={handleContactDelete}
      />
    </div>
  )
}
