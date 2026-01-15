'use client'

import { Contact } from '@aromarious/ui'

import { api } from '~/trpc/react'

export default function ClientContactWrapper() {
  const contactMutation = api.contact.submit.useMutation({
    onSuccess: (data) => {
      console.log('Contact form submitted successfully:', data.message)
    },
    onError: (error) => {
      console.error('Contact form submission failed:', error.message)
    },
  })

  return <Contact contactMutation={contactMutation} />
}
