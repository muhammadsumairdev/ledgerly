import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAsync } from '@/hooks/useAsync'
import { getSettings, getSettingsSync, saveSettings } from '@/lib/api'
import { resetDemo } from '@/lib/storage'
import { useUi } from '@/store/ui'
import type { Settings as SettingsType } from '@/types'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SAR', 'AED', 'INR']

/** Card panel with a heading + description. */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

interface FormValues {
  businessName: string
  addressLine: string
  email: string
  phone: string
  prefix: string
  nextNumber: number
  defaultTaxRate: number
  currency: string
}

export default function Settings() {
  const bumpData = useUi((s) => s.bumpData)
  const { data: settings } = useAsync(getSettings, [])
  const [resetOpen, setResetOpen] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  useEffect(() => {
    if (!settings) return
    setLogo(settings.logo)
    reset({
      businessName: settings.businessName,
      addressLine: settings.addressLine,
      email: settings.email,
      phone: settings.phone,
      prefix: settings.prefix,
      nextNumber: settings.nextNumber,
      defaultTaxRate: settings.defaultTaxRate,
      currency: settings.currency,
    })
  }, [settings, reset])

  const prefix = watch('prefix') ?? settings?.prefix ?? 'LED'
  const nextNumber = Number(watch('nextNumber') ?? settings?.nextNumber ?? 1)
  const numberPreview = `${prefix}-${String(Number.isFinite(nextNumber) ? nextNumber : 1).padStart(4, '0')}`

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 200_000) {
      toast.error('Logo must be under 200 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = async (values: FormValues) => {
    if (!settings) return
    // Re-read the latest settings: invoices created since this form loaded may
    // have advanced nextNumber. Only overwrite the counter if the user actually
    // edited it here — otherwise keep the live value so we never roll it back
    // and hand out a colliding number.
    const fresh = getSettingsSync()
    const formNext = Math.max(1, Math.floor(Number(values.nextNumber) || 1))
    const record: SettingsType = {
      ...fresh,
      businessName: values.businessName.trim(),
      addressLine: values.addressLine.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      prefix: values.prefix.trim().toUpperCase(),
      nextNumber: values.nextNumber === settings.nextNumber ? fresh.nextNumber : formNext,
      defaultTaxRate: Math.min(100, Math.max(0, Number(values.defaultTaxRate) || 0)),
      currency: values.currency,
      logo,
    }
    await saveSettings(record)
    bumpData()
    toast.success('Settings saved')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" subtitle="Your business profile and invoice defaults." />

      {!settings ? (
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-line bg-card p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-9 w-full" />
              <Skeleton className="mt-3 h-9 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Section title="Business profile" description="Shown at the top of every invoice.">
            <div className="flex items-center gap-4">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="h-14 w-14 rounded-xl border border-line object-contain p-1"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-xl font-bold text-accent-fg">
                  {(watch('businessName') || settings.businessName || 'L').charAt(0)}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onLogoChange}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" />
                  {logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                {logo && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(null)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Business name" error={errors.businessName?.message}>
                <Input {...register('businessName', { required: 'Business name is required' })} />
              </Field>
              <Field label="Address" error={errors.addressLine?.message}>
                <Textarea rows={2} {...register('addressLine')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Billing email" error={errors.email?.message}>
                  <Input type="email" {...register('email')} />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <Input {...register('phone')} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Invoicing" description="Numbering, tax and currency defaults for new invoices.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number prefix" hint={`Next invoice: ${numberPreview}`} error={errors.prefix?.message}>
                <Input {...register('prefix', { required: 'Prefix is required' })} placeholder="LED" />
              </Field>
              <Field label="Next number" error={errors.nextNumber?.message}>
                <Input type="number" min={1} {...register('nextNumber', { valueAsNumber: true })} />
              </Field>
              <Field label="Default tax rate (%)" error={errors.defaultTaxRate?.message}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  {...register('defaultTaxRate', { valueAsNumber: true })}
                />
              </Field>
              <Field label="Currency">
                <Select {...register('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Save settings
              </Button>
            </div>
          </Section>
        </form>
      )}

      <Section title="Appearance" description="Choose how Ledgerly looks on this device.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Light and dark are fixed; system follows your OS.</p>
          <ThemeToggle />
        </div>
      </Section>

      <Section
        title="Data"
        description="This demo is backed by an API-shaped localStorage layer — nothing leaves your browser."
      >
        <Button variant="danger" onClick={() => setResetOpen(true)}>
          Reset demo data
        </Button>
      </Section>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data"
        description="This restores the original demo clients, invoices and settings."
      >
        <div className="flex justify-end gap-2 p-5">
          <Button variant="ghost" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => resetDemo()}>
            Reset demo data
          </Button>
        </div>
      </Modal>
    </div>
  )
}
