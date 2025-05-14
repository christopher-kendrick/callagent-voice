"use client"

import { useSession } from "next-auth/react"
import { ContactList } from "@coogichrisla/contact-elements"

export function ContactListWrapper() {
  const { data: session } = useSession()
  const userId = session?.user?.id || ""

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Contacts</h2>
      {userId ? (
        <ContactList
          userId={userId}
          onContactClick={(contact) => console.log("Click", contact)}
          onContactEdit={(contact) => console.log("Edit", contact)}
          onContactDelete={(contact) => console.log("Delete", contact)}
        />
      ) : (
        <div className="text-center py-4 text-gray-500">Please sign in to view your contacts</div>
      )}
    </div>
  )
}
