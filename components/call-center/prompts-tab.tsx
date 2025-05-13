"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"

// Define explicit type with defaults
interface Prompt {
  id: number
  name: string
  text: string
  humePromptId: string | null
  createdAt: string
  updatedAt: string
}

export function PromptsTab() {
  const { data: session } = useSession()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [formData, setFormData] = useState({ name: "", text: "" })
  const [submitting, setSubmitting] = useState(false)

  // Fetch prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      if (!session) return

      try {
        setLoading(true)
        const response = await fetch("/api/prompts")
        if (response.ok) {
          const data = await response.json()
          // Ensure we always have an array, even if the API returns undefined
          setPrompts(data.prompts || [])
        } else {
          console.error("Failed to fetch prompts")
          setPrompts([]) // Set to empty array on error
          toast({
            title: "Error",
            description: "Failed to fetch prompts",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching prompts:", error)
        setPrompts([]) // Set to empty array on error
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPrompts()
  }, [session])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Create prompt
  const handleCreatePrompt = async () => {
    if (!formData.name || !formData.text) {
      toast({
        title: "Error",
        description: "Name and text are required",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok || response.status === 207) {
        // Safely update prompts array
        if (data.prompt) {
          setPrompts((prev) => [...(prev || []), data.prompt])
        }
        setCreateDialogOpen(false)
        setFormData({ name: "", text: "" })

        if (response.status === 207) {
          toast({
            title: "Partial Success",
            description: "Prompt saved to database but not to Hume AI. You may need to recreate it.",
            variant: "warning",
          })
        } else {
          toast({
            title: "Success",
            description: "Prompt created successfully",
          })
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create prompt",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating prompt:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Edit prompt
  const handleEditPrompt = async () => {
    if (!selectedPrompt) return
    if (!formData.name || !formData.text) {
      toast({
        title: "Error",
        description: "Name and text are required",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/prompts/${selectedPrompt.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok || response.status === 207) {
        // Safely update prompts array
        if (data.prompt) {
          setPrompts((prev) => (prev || []).map((p) => (p.id === selectedPrompt.id ? data.prompt : p)))
        }
        setEditDialogOpen(false)
        setSelectedPrompt(null)
        setFormData({ name: "", text: "" })

        if (response.status === 207 || data.humeError) {
          toast({
            title: "Partial Success",
            description: "Prompt updated in database but not in Hume AI",
            variant: "warning",
          })
        } else {
          toast({
            title: "Success",
            description: "Prompt updated successfully",
          })
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update prompt",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating prompt:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Delete prompt
  const handleDeletePrompt = async () => {
    if (!selectedPrompt) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/prompts/${selectedPrompt.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok || response.status === 207) {
        // Safely update prompts array
        setPrompts((prev) => (prev || []).filter((p) => p.id !== selectedPrompt.id))
        setDeleteDialogOpen(false)
        setSelectedPrompt(null)

        if (response.status === 207 || data.humeError) {
          toast({
            title: "Partial Success",
            description: "Prompt deleted from database but not from Hume AI",
            variant: "warning",
          })
        } else {
          toast({
            title: "Success",
            description: "Prompt deleted successfully",
          })
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete prompt",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting prompt:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setFormData({
      name: prompt.name,
      text: prompt.text,
    })
    setEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setDeleteDialogOpen(true)
  }

  // Ensure we have a safe array to work with
  const safePrompts = Array.isArray(prompts) ? prompts : []

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hume AI Prompts</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Prompt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Prompt</DialogTitle>
              <DialogDescription>Create a new prompt for Hume AI to use during calls.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Prompt Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Weather Assistant Prompt"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text">Prompt Text</Label>
                <Textarea
                  id="text"
                  name="text"
                  placeholder="<role>You are an AI weather assistant providing users with accurate and up-to-date weather information...</role>"
                  value={formData.text}
                  onChange={handleInputChange}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use &lt;role&gt; tags to define the AI's role and behavior.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePrompt} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Prompt"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {safePrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No prompts found</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Prompt
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {safePrompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="truncate">{prompt.name}</span>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(prompt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(prompt)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {prompt.humePromptId ? (
                    <span className="text-green-600">Synced with Hume AI</span>
                  ) : (
                    <span className="text-amber-600">Not synced with Hume AI</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[150px] overflow-y-auto rounded border p-3 text-sm">{prompt.text}</div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Created: {new Date(prompt.createdAt).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>Update your Hume AI prompt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Prompt Name</Label>
              <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text">Prompt Text</Label>
              <Textarea
                id="edit-text"
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPrompt} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Prompt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prompt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePrompt} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Prompt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
