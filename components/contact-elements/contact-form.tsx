"use client"
import { useState } from "react"
import { Alert, AlertCircle, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ContactForm as ContactFormComponent } from "@coogichrisla/contact-elements"

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
      <ContactFormComponent onSubmit={handleSubmit} onCancel={handleCancel} initialData={initialData} isEdit={isEdit} />
    </div>
  )
}
