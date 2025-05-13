"use client"

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
import { Loader2, Plus, Edit, Trash2, RefreshCw } from "lucide-react"
import { ConfigForm } from "./config-form"
import { toast } from "sonner"

interface Config {
  id: number
  name: string
  humeConfigId: string | null
  promptId: string | null
  voiceName: string | null
  createdAt: string
  updatedAt: string
}

export function ConfigsTab() {
  const { data: session } = useSession()
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch configs
  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/configs")
      const data = await response.json()

      if (response.ok) {
        setConfigs(data.configs || [])
      } else {
        toast.error(data.error || "Failed to fetch configs")
      }
    } catch (error) {
      console.error("Error fetching configs:", error)
      toast.error("An error occurred while fetching configs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchConfigs()
    }
  }, [session])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchConfigs()
    setRefreshing(false)
  }

  // Handle create
  const handleCreate = async (formData: any) => {
    try {
      const response = await fetch("/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Config created successfully")
        setCreateDialogOpen(false)
        fetchConfigs()
      } else {
        toast.error(data.error || "Failed to create config")
      }
    } catch (error) {
      console.error("Error creating config:", error)
      toast.error("An error occurred while creating config")
    }
  }

  // Handle edit
  const handleEdit = async (formData: any) => {
    if (!selectedConfig) return

    try {
      const response = await fetch(`/api/configs/${selectedConfig.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Config updated successfully")
        setEditDialogOpen(false)
        fetchConfigs()
      } else {
        toast.error(data.error || "Failed to update config")
      }
    } catch (error) {
      console.error("Error updating config:", error)
      toast.error("An error occurred while updating config")
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!selectedConfig) return

    try {
      const response = await fetch(`/api/configs/${selectedConfig.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Config deleted successfully")
        setDeleteDialogOpen(false)
        fetchConfigs()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete config")
      }
    } catch (error) {
      console.error("Error deleting config:", error)
      toast.error("An error occurred while deleting config")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hume Configurations</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Config
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Configuration</DialogTitle>
                <DialogDescription>Create a new Hume AI configuration for your calls.</DialogDescription>
              </DialogHeader>
              <ConfigForm onSubmit={handleCreate} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No configurations found</p>
          <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Configuration
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <CardTitle>{config.name}</CardTitle>
                <CardDescription>{config.humeConfigId ? "Synced with Hume AI" : "Not synced"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voice:</span>
                    <span className="font-medium">{config.voiceName || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date(config.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-medium">{new Date(config.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Dialog
                  open={editDialogOpen && selectedConfig?.id === config.id}
                  onOpenChange={(open) => {
                    setEditDialogOpen(open)
                    if (!open) setSelectedConfig(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConfig(config)
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Configuration</DialogTitle>
                      <DialogDescription>Update your Hume AI configuration.</DialogDescription>
                    </DialogHeader>
                    {selectedConfig && <ConfigForm config={selectedConfig} onSubmit={handleEdit} />}
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={deleteDialogOpen && selectedConfig?.id === config.id}
                  onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) setSelectedConfig(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedConfig(config)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Configuration</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this configuration? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
