"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScriptsTab } from "./scripts-tab"
import { NewCallTab } from "./new-call-tab"
import { CallsTab } from "./calls-tab"
import { PromptsTab } from "./prompts-tab"
import { ConfigsTab } from "./configs-tab"
import { ContactListWrapper } from "./contact-list-wrapper"

export function CallCenterDashboard() {
  const [activeTab, setActiveTab] = useState("new-call")

  // Initialize all data with empty arrays to prevent undefined errors
  const [contacts, setContacts] = useState([])
  const [scripts, setScripts] = useState([])
  const [calls, setCalls] = useState([])

  // Initialize loading states
  const [loading, setLoading] = useState({
    contacts: false,
    scripts: false,
    calls: false,
  })

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === "contacts" || activeTab === "new-call") {
        try {
          setLoading((prev) => ({ ...prev, contacts: true }))
          const response = await fetch("/api/contacts")
          if (response.ok) {
            const data = await response.json()
            setContacts(data || [])
          }
        } catch (error) {
          console.error("Error fetching contacts:", error)
        } finally {
          setLoading((prev) => ({ ...prev, contacts: false }))
        }
      }

      if (activeTab === "scripts" || activeTab === "new-call") {
        try {
          setLoading((prev) => ({ ...prev, scripts: true }))
          const response = await fetch("/api/scripts")
          if (response.ok) {
            const data = await response.json()
            setScripts(data || [])
          }
        } catch (error) {
          console.error("Error fetching scripts:", error)
        } finally {
          setLoading((prev) => ({ ...prev, scripts: false }))
        }
      }

      if (activeTab === "calls") {
        try {
          setLoading((prev) => ({ ...prev, calls: true }))
          const response = await fetch("/api/calls")
          if (response.ok) {
            const data = await response.json()
            setCalls(data || [])
          }
        } catch (error) {
          console.error("Error fetching calls:", error)
        } finally {
          setLoading((prev) => ({ ...prev, calls: false }))
        }
      }
    }

    fetchData()
  }, [activeTab])

  const handleRefresh = async () => {
    if (activeTab === "contacts") {
      try {
        setLoading((prev) => ({ ...prev, contacts: true }))
        const response = await fetch("/api/contacts")
        if (response.ok) {
          const data = await response.json()
          setContacts(data || [])
        }
      } catch (error) {
        console.error("Error refreshing contacts:", error)
      } finally {
        setLoading((prev) => ({ ...prev, contacts: false }))
      }
    } else if (activeTab === "scripts") {
      try {
        setLoading((prev) => ({ ...prev, scripts: true }))
        const response = await fetch("/api/scripts")
        if (response.ok) {
          const data = await response.json()
          setScripts(data || [])
        }
      } catch (error) {
        console.error("Error refreshing scripts:", error)
      } finally {
        setLoading((prev) => ({ ...prev, scripts: false }))
      }
    } else if (activeTab === "calls") {
      try {
        setLoading((prev) => ({ ...prev, calls: true }))
        const response = await fetch("/api/calls")
        if (response.ok) {
          const data = await response.json()
          setCalls(data || [])
        }
      } catch (error) {
        console.error("Error refreshing calls:", error)
      } finally {
        setLoading((prev) => ({ ...prev, calls: false }))
      }
    }
  }

  return (
    <Tabs defaultValue="new-call" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="new-call">New Call</TabsTrigger>
        <TabsTrigger value="calls">Call Records</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="scripts">Scripts</TabsTrigger>
        <TabsTrigger value="prompts">Prompts</TabsTrigger>
        <TabsTrigger value="configs">Configs</TabsTrigger>
      </TabsList>

      <TabsContent value="new-call" className="space-y-4">
        <NewCallTab
          contacts={contacts || []}
          scripts={scripts || []}
          loading={loading.contacts || loading.scripts}
          onCallInitiated={() => {
            handleRefresh()
            setActiveTab("calls")
          }}
        />
      </TabsContent>

      <TabsContent value="calls" className="space-y-4">
        <CallsTab callRecords={calls || []} loading={loading.calls} onRefresh={handleRefresh} />
      </TabsContent>

      <TabsContent value="contacts" className="space-y-4">
        <ContactListWrapper />
      </TabsContent>

      <TabsContent value="scripts" className="space-y-4">
        <ScriptsTab scripts={scripts || []} loading={loading.scripts} onScriptsChange={handleRefresh} />
      </TabsContent>

      <TabsContent value="prompts" className="space-y-4">
        <PromptsTab />
      </TabsContent>

      <TabsContent value="configs" className="space-y-4">
        <ConfigsTab />
      </TabsContent>
    </Tabs>
  )
}
