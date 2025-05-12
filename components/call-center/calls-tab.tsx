"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCwIcon, PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { CallRecord } from "@/lib/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CallsTabProps {
  callRecords: CallRecord[]
  loading: boolean
  onRefresh: () => void
}

export function CallsTab({ callRecords, loading, onRefresh }: CallsTabProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "in-progress":
        return <Badge variant="secondary">In Progress</Badge>
      case "completed":
        return <Badge variant="success">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Call Records</CardTitle>
          <CardDescription>View your AI call history</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCwIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">Loading call records...</div>
        ) : callRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-muted-foreground">No call records found</p>
            <Button variant="outline" onClick={() => router.push("/dashboard?tab=new-call")}>
              <PhoneIcon className="mr-2 h-4 w-4" />
              Make Your First Call
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Script</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">#{record.id}</TableCell>
                    <TableCell>{record.scriptId ? `#${record.scriptId}` : "N/A"}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.metadata?.contactCount || "Unknown"}</TableCell>
                    <TableCell>
                      {record.startTime ? new Date(record.startTime).toLocaleString() : "Not started"}
                    </TableCell>
                    <TableCell>{record.endTime ? new Date(record.endTime).toLocaleString() : "In progress"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/calls/${record.id}`)}>
                        View
                      </Button>
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
