"use client"

import React from "react"

import { useState } from "react"
import { useSession } from "next-auth/react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertCircle, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Dynamically import the ContactList component with SSR disabled
const ContactListComponent = dynamic(() => import("@coogichrisla/contact-elements").then((mod) => mod.ContactList), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  ),
})

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
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
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
      <ErrorBoundary fallback={<p>Something went wrong with the contact list. Please try again later.</p>}>
        <ContactListComponent
          userId={session?.user?.id || ""}
          onContactClick={handleContactClick}
          onContactEdit={handleContactEdit}
          onContactDelete={handleContactDelete}
        />
      </ErrorBoundary>
    </div>
  )
}

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Contact list error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
