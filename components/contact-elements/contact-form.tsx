"use client"

import React from "react"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertCircle, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Dynamically import the ContactForm component with SSR disabled
const ContactFormComponent = dynamic(() => import("@coogichrisla/contact-elements").then((mod) => mod.ContactForm), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  ),
})

interface ContactFormProps {
  onSubmit?: (data: any) => void
  onCancel?: () => void
  initialData?: any
  isEdit?: boolean
}

export function ContactForm({ onSubmit, onCancel, initialData, isEdit = false }: ContactFormProps) {
  const [error, setError] = useState<string | null>(null)

  // Handle form submission
  const handleSubmit = (data: any) => {
    try {
      console.log("Form submitted:", data)
      if (onSubmit) {
        onSubmit(data)
      }
    } catch (err) {
      console.error("Error submitting form:", err)
      setError("Failed to submit the form. Please try again.")
    }
  }

  // Handle form cancellation
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
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
    <div className="contact-form-wrapper">
      <ErrorBoundary fallback={<p>Something went wrong with the contact form. Please try again later.</p>}>
        <ContactFormComponent
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={initialData}
          isEdit={isEdit}
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
    console.error("Contact form error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
