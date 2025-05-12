"use client"

import type React from "react"

import { useState } from "react"
import { PlusIcon, Trash2Icon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Script } from "@/lib/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ScriptsTabProps {
  scripts: Script[]
  loading: boolean
  onScriptsChange: () => void
}

export function ScriptsTab({ scripts, loading, onScriptsChange }: ScriptsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newScript, setNewScript] = useState({
    title: "",
    content: "",
    isTemplate: false,
  })

  const handleAddScript = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/scripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newScript),
      })

      if (response.ok) {
        setNewScript({
          title: "",
          content: "",
          isTemplate: false,
        })
        setIsAddDialogOpen(false)
        onScriptsChange()
      } else {
        console.error("Failed to add script")
      }
    } catch (error) {
      console.error("Error adding script:", error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Scripts</CardTitle>
          <CardDescription>Manage your AI call scripts</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Script</DialogTitle>
              <DialogDescription>Create a new script for your AI calls.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddScript}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newScript.title}
                    onChange={(e) => setNewScript({ ...newScript, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Script Content</Label>
                  <Textarea
                    id="content"
                    rows={10}
                    value={newScript.content}
                    onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                    required
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isTemplate"
                    checked={newScript.isTemplate}
                    onCheckedChange={(checked) =>
                      setNewScript({
                        ...newScript,
                        isTemplate: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="isTemplate">Save as template</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Script</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">Loading scripts...</div>
        ) : scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-muted-foreground">No scripts found</p>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Your First Script
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map((script) => (
                  <TableRow key={script.id}>
                    <TableCell className="font-medium">{script.title}</TableCell>
                    <TableCell>
                      {script.content.length > 50 ? `${script.content.substring(0, 50)}...` : script.content}
                    </TableCell>
                    <TableCell>{script.isTemplate ? "Template" : "Custom"}</TableCell>
                    <TableCell>{new Date(script.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
