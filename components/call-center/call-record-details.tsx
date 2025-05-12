"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface CallRecordDetailsProps {
  callRecord: any // Using any for simplicity, but you should define a proper type
}

export function CallRecordDetails({ callRecord }: CallRecordDetailsProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/calls/${callRecord.id}`)
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Error refreshing call record:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "in-progress":
      case "ringing":
      case "queued":
      case "initiated":
        return <Badge variant="secondary">In Progress</Badge>
      case "completed":
      case "answered":
        return <Badge variant="success">Completed</Badge>
      case "failed":
      case "busy":
      case "no-answer":
      case "canceled":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1">
          <RefreshCwIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call Record #{callRecord.id}</CardTitle>
          <CardDescription>Created on {new Date(callRecord.createdAt).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <div className="mt-1">{getStatusBadge(callRecord.status)}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Script</h3>
                <div className="mt-1">{callRecord.script?.title || "N/A"}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Contact Count</h3>
                <div className="mt-1">{callRecord.callDetails?.length || 0}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Start Time</h3>
                <div className="mt-1">
                  {callRecord.startTime ? new Date(callRecord.startTime).toLocaleString() : "Not started"}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">End Time</h3>
                <div className="mt-1">
                  {callRecord.endTime ? new Date(callRecord.endTime).toLocaleString() : "In progress"}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                <div className="mt-1">
                  {callRecord.startTime && callRecord.endTime
                    ? `${Math.round(
                        (new Date(callRecord.endTime).getTime() - new Date(callRecord.startTime).getTime()) / 1000 / 60,
                      )} minutes`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Script Content</h3>
            <div className="rounded-md border p-4">
              <p className="whitespace-pre-wrap">{callRecord.script?.content || "No script content available"}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Call Details</h3>
            {callRecord.callDetails?.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callRecord.callDetails.map((detail: any) => (
                      <TableRow key={detail.id}>
                        <TableCell className="font-medium">{detail.contact?.name || "Unknown"}</TableCell>
                        <TableCell>{detail.contact?.phoneNumber || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(detail.status)}</TableCell>
                        <TableCell>
                          {detail.startTime ? new Date(detail.startTime).toLocaleString() : "Not started"}
                        </TableCell>
                        <TableCell>{detail.duration ? `${detail.duration} seconds` : "N/A"}</TableCell>
                        <TableCell>
                          {detail.recordingUrl ? (
                            <Button variant="link" size="sm" asChild>
                              <a href={detail.recordingUrl} target="_blank" rel="noopener noreferrer">
                                Listen
                              </a>
                            </Button>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex justify-center py-8 text-muted-foreground">No call details available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
