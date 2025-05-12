"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  promptId: z.string().min(1, "Prompt is required"),
  promptVersion: z.coerce.number().int().default(0),
  eviVersion: z.string().default("2"),
  voiceProvider: z.string().default("HUME_AI"),
  voiceName: z.string().min(1, "Voice is required"),
  modelProvider: z.string().default("ANTHROPIC"),
  modelResource: z.string().default("claude-3-7-sonnet-latest"),
  temperature: z.coerce.number().int().min(0).max(100).default(1),
  onNewChatEnabled: z.boolean().default(false),
  onNewChatText: z.string().default(""),
  onInactivityTimeoutEnabled: z.boolean().default(false),
  onInactivityTimeoutText: z.string().default(""),
  onMaxDurationTimeoutEnabled: z.boolean().default(false),
  onMaxDurationTimeoutText: z.string().default(""),
})

type FormValues = z.infer<typeof formSchema>

interface Prompt {
  id: number
  name: string
  humePromptId: string | null
}

// Hard-coded list of Hume AI voices
const HUME_VOICES = [
  { name: "ITO", gender: "Male", language: "English" },
  { name: "KORA", gender: "Female", language: "English" },
  { name: "DACHER", gender: "Male", language: "English" },
  { name: "AURA", gender: "Female", language: "English" },
  { name: "FINN", gender: "Male", language: "English" },
  { name: "WHIMSY", gender: "Female", language: "English" },
  { name: "STELLA", gender: "Female", language: "English" },
  { name: "SUNNY", gender: "Female", language: "English" },
]

interface ConfigFormProps {
  config?: any
  onSubmit: (data: FormValues) => void
}

export function ConfigForm({ config, onSubmit }: ConfigFormProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: config
      ? {
          name: config.name || "",
          promptId: config.promptId || "",
          promptVersion: config.promptVersion || 0,
          eviVersion: config.eviVersion || "2",
          voiceProvider: config.voiceProvider || "HUME_AI",
          voiceName: config.voiceName || "",
          modelProvider: config.modelProvider || "ANTHROPIC",
          modelResource: config.modelResource || "claude-3-7-sonnet-latest",
          temperature: config.temperature || 1,
          onNewChatEnabled: config.onNewChatEnabled || false,
          onNewChatText: config.onNewChatText || "",
          onInactivityTimeoutEnabled: config.onInactivityTimeoutEnabled || false,
          onInactivityTimeoutText: config.onInactivityTimeoutText || "",
          onMaxDurationTimeoutEnabled: config.onMaxDurationTimeoutEnabled || false,
          onMaxDurationTimeoutText: config.onMaxDurationTimeoutText || "",
        }
      : {
          name: "",
          promptId: "",
          promptVersion: 0,
          eviVersion: "2",
          voiceProvider: "HUME_AI",
          voiceName: "",
          modelProvider: "ANTHROPIC",
          modelResource: "claude-3-7-sonnet-latest",
          temperature: 1,
          onNewChatEnabled: false,
          onNewChatText: "",
          onInactivityTimeoutEnabled: false,
          onInactivityTimeoutText: "",
          onMaxDurationTimeoutEnabled: false,
          onMaxDurationTimeoutText: "",
        },
  })

  // Fetch prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoadingPrompts(true)
        const response = await fetch("/api/prompts")
        const data = await response.json()

        if (response.ok) {
          setPrompts(data.prompts || [])
        } else {
          toast.error(data.error || "Failed to fetch prompts")
        }
      } catch (error) {
        console.error("Error fetching prompts:", error)
        toast.error("An error occurred while fetching prompts")
      } finally {
        setLoadingPrompts(false)
      }
    }

    fetchPrompts()
  }, [])

  // Handle form submission
  const handleFormSubmit = (values: FormValues) => {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="model">Model Settings</TabsTrigger>
            <TabsTrigger value="events">Event Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Configuration Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a name for this configuration" {...field} />
                  </FormControl>
                  <FormDescription>A descriptive name to identify this configuration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promptId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a prompt" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingPrompts ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading prompts...
                        </div>
                      ) : prompts.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No prompts found. Please create a prompt first.
                        </div>
                      ) : (
                        prompts
                          .filter((prompt) => prompt.humePromptId)
                          .map((prompt) => (
                            <SelectItem key={prompt.id} value={prompt.humePromptId || ""}>
                              {prompt.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select a prompt for this configuration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promptVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Version</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormDescription>The version of the prompt to use (default: 0)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eviVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EVI Version</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select EVI version" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="2">Version 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>The version of the Empathic Voice Interface to use</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="voiceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voice</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HUME_VOICES.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select a voice for this configuration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="model" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="modelProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
                      <SelectItem value="OPENAI">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>The provider of the language model</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelResource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Resource</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</SelectItem>
                      <SelectItem value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-3-opus-latest">Claude 3 Opus</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>The specific model to use</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature ({field.value})</FormLabel>
                  <FormControl>
                    <Input type="range" min="0" max="100" step="1" {...field} className="w-full" />
                  </FormControl>
                  <FormDescription>Controls randomness: 0 is deterministic, 100 is very random</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="events" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">On New Chat</h3>
              <FormField
                control={form.control}
                name="onNewChatEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable New Chat Message</FormLabel>
                      <FormDescription>Send a message when a new chat session starts</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("onNewChatEnabled") && (
                <FormField
                  control={form.control}
                  name="onNewChatText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Chat Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter message to send when a new chat starts"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">On Inactivity Timeout</h3>
              <FormField
                control={form.control}
                name="onInactivityTimeoutEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Inactivity Timeout Message</FormLabel>
                      <FormDescription>Send a message when the chat is inactive for a period of time</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("onInactivityTimeoutEnabled") && (
                <FormField
                  control={form.control}
                  name="onInactivityTimeoutText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inactivity Timeout Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter message to send on inactivity timeout"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">On Max Duration Timeout</h3>
              <FormField
                control={form.control}
                name="onMaxDurationTimeoutEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Max Duration Timeout Message</FormLabel>
                      <FormDescription>Send a message when the chat reaches its maximum duration</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("onMaxDurationTimeoutEnabled") && (
                <FormField
                  control={form.control}
                  name="onMaxDurationTimeoutText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Duration Timeout Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter message to send on max duration timeout"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="submit">{config ? "Update Configuration" : "Create Configuration"}</Button>
        </div>
      </form>
    </Form>
  )
}
