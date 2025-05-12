"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContactsTab } from "./contacts-tab"
import { ScriptsTab } from "./scripts-tab"
import { CallsTab } from "./calls-tab"
import { NewCallTab } from "./new-call-tab"
import type { Contact, Script, CallRecord } from "@/lib/db/schema"

export function CallCenterDashboard() {
  const { data: session } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [callRecords, setCallRecords] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState({
    contacts: true,
    scripts: true,
    callRecords: true,
  })

  useEffect(() => {
    if (session?.user) {
      // Fetch contacts
      fetch("/api/contacts")
        .then((res) => res.json())
        .then((data) => {
          setContacts(data)
          setLoading((prev) => ({ ...prev, contacts: false }))
        })
        .catch((error) => {
          console.error("Error fetching contacts:", error)
          setLoading((prev) => ({ ...prev, contacts: false }))
        })

      // Fetch scripts
      fetch("/api/scripts")
        .then((res) => res.json())
        .then((data) => {
          setScripts(data)
          setLoading((prev) => ({ ...prev, scripts: false }))
        })
        .catch((error) => {
          console.error("Error fetching scripts:", error)
          setLoading((prev) => ({ ...prev, scripts: false }))
        })

      // Fetch call records
      fetch("/api/calls")
        .then((res) => res.json())
        .then((data) => {
          setCallRecords(data)
          setLoading((prev) => ({ ...prev, callRecords: false }))
        })
        .catch((error) => {
          console.error("Error fetching call records:", error)
          setLoading((prev) => ({ ...prev, callRecords: false }))
        })
    }
  }, [session])

  const refreshData = async () => {
    try {
      setLoading({
        contacts: true,
        scripts: true,
        callRecords: true,
      })

      const [contactsRes, scriptsRes, callRecordsRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/scripts"),
        fetch("/api/calls"),
      ])

      const [contactsData, scriptsData, callRecordsData] = await Promise.all([
        contactsRes.json(),
        scriptsRes.json(),
        callRecordsRes.json(),
      ])

      setContacts(contactsData)
      setScripts(scriptsData)
      setCallRecords(callRecordsData)
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setLoading({
        contacts: false,
        scripts: false,
        callRecords: false,
      })
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <Tabs defaultValue="new-call" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="new-call">New Call</TabsTrigger>
          <TabsTrigger value="calls">Call Records</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
        </TabsList>
        <TabsContent value="new-call" className="p-4">
          <NewCallTab
            contacts={contacts}
            scripts={scripts}
            loading={loading.contacts || loading.scripts}
            onCallInitiated={refreshData}
          />
        </TabsContent>
        <TabsContent value="calls" className="p-4">
          <CallsTab callRecords={callRecords} loading={loading.callRecords} onRefresh={refreshData} />
        </TabsContent>
        <TabsContent value="contacts" className="p-4">
          <ContactsTab contacts={contacts} loading={loading.contacts} onContactsChange={refreshData} />
        </TabsContent>
        <TabsContent value="scripts" className="p-4">
          <ScriptsTab scripts={scripts} loading={loading.scripts} onScriptsChange={refreshData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
