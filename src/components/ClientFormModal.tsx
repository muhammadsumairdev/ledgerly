import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { getClientsSync, saveClient } from '@/lib/api'
import { makeId } from '@/lib/utils'
import { useUi } from '@/store/ui'
import type { Client } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Contact name is required'),
  company: z.string().trim().min(1, 'Company is required'),
  email: z.string().trim().email('Enter a valid email'),
  address: z.string().trim().optional(),
})
type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = { name: '', company: '', email: '', address: '' }

/** Global create/edit client dialog, driven by the ui store. */
export function ClientFormModal() {
  const open = useUi((s) => s.clientFormOpen)
  const editingId = useUi((s) => s.editingClientId)
  const close = useUi((s) => s.closeClientForm)
  const bumpData = useUi((s) => s.bumpData)

  const existing = editingId ? getClientsSync().find((c) => c.id === editingId) : undefined

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  // Sync the form with the record being edited each time the modal opens.
  useEffect(() => {
    if (!open) return
    reset(
      existing
        ? { name: existing.name, company: existing.company, email: existing.email, address: existing.address }
        : EMPTY,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId])

  const onSubmit = async (values: FormValues) => {
    const record: Client = {
      id: existing?.id ?? makeId('cl'),
      name: values.name.trim(),
      company: values.company.trim(),
      email: values.email.trim(),
      address: values.address?.trim() ?? '',
      avatar:
        existing?.avatar ??
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
          values.name.trim(),
        )}&backgroundColor=0E9F6E&textColor=ffffff&fontWeight=600`,
    }
    await saveClient(record)
    bumpData()
    toast.success(existing ? 'Client updated' : 'Client added')
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={existing ? 'Edit client' : 'New client'}
      description={existing ? undefined : 'Add someone you invoice.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Ava Bennett" autoFocus />
          </Field>
          <Field label="Company" error={errors.company?.message}>
            <Input {...register('company')} placeholder="Brightwave Media" />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          <Input {...register('email')} type="email" placeholder="ava@brightwave.io" />
        </Field>
        <Field label="Billing address" error={errors.address?.message}>
          <Textarea {...register('address')} rows={2} placeholder={'240 Larkspur Ave\nAustin, TX 78702'} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {existing ? 'Save client' : 'Add client'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
