import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { callRecords } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { CallRecordDetails } from "@/components/call-center/call-record-details"

export default async function CallRecordPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  const callRecordId = Number.parseInt(params.id)

  if (isNaN(callRecordId)) {
    redirect("/dashboard")
  }

  const callRecord = await db.query.callRecords.findFirst({
    where: and(eq(callRecords.id, callRecordId), eq(callRecords.userId, session.user.id)),
    with: {
      script: true,
      callDetails: {
        with: {
          contact: true,
        },
      },
    },
  })

  if (!callRecord) {
    redirect("/dashboard")
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <CallRecordDetails callRecord={callRecord} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
