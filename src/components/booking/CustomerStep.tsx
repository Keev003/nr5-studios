import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { InputField, TextareaField } from '@/components/ui'
import { useBooking } from '@/hooks/useBooking'
import { useI18n } from '@/i18n/useI18n'
import { checkAge } from '@/lib/age'
import { makeCustomerSchema, type CustomerFormValues } from '@/lib/validation'
import type { StudioSettings } from '@/types/booking'
import { AgeNotice } from './AgeNotice'
import { BookingNav } from './BookingNav'
import { ImageUpload } from './ImageUpload'
import { StepHeading } from './StepHeading'

const FORM_ID = 'customer-form'

export function CustomerStep({ settings, onBack, onNext }: { settings: StudioSettings; onBack: () => void; onNext: () => void }) {
  const { draft, saveCustomer, referenceImage, setReferenceImage } = useBooking()
  const { t } = useI18n()
  const schema = useMemo(() => makeCustomerSchema(t.validation), [t])
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      tattooPlacement: '',
      tattooDescription: '',
      ...draft.customer,
    },
  })

  // Keep the draft in sync so nothing is lost when going back or reloading.
  const values = useWatch({ control })
  useEffect(() => saveCustomer(values), [values, saveCustomer])

  const dob = values.dateOfBirth
  const ageCheck = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) && draft.date ? checkAge(dob, draft.date, settings) : null
  const blocked = ageCheck?.kind === 'not_permitted'
  const descriptionLength = values.tattooDescription?.length ?? 0

  return (
    <>
      <StepHeading title={t.booking.customerTitle}>{t.booking.customerIntro}</StepHeading>
      <form id={FORM_ID} noValidate onSubmit={handleSubmit(onNext)} className="space-y-8">
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">{t.booking.contactInfo}</legend>
          <div className="sm:col-span-2">
            <InputField label={t.booking.fullName} autoComplete="name" required error={errors.fullName?.message} {...register('fullName')} />
          </div>
          <InputField
            label={t.booking.dateOfBirth}
            type="date"
            autoComplete="bday"
            required
            max={new Date().toISOString().slice(0, 10)}
            hint={t.booking.dobHint}
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />
          <InputField label={t.booking.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="+47 400 00 000" required error={errors.phone?.message} {...register('phone')} />
          <div className="sm:col-span-2">
            <InputField label={t.booking.email} type="email" inputMode="email" autoComplete="email" required hint={t.booking.emailHint} error={errors.email?.message} {...register('email')} />
          </div>
        </fieldset>

        {ageCheck && <AgeNotice check={ageCheck} settings={settings} />}

        <fieldset className="space-y-5">
          <legend className="mb-1 font-display text-xl">{t.booking.aboutTattoo}</legend>
          <InputField label={t.booking.placement} placeholder={t.booking.placementPlaceholder} required error={errors.tattooPlacement?.message} {...register('tattooPlacement')} />
          <TextareaField
            label={t.booking.description}
            rows={5}
            required
            placeholder={t.booking.descriptionPlaceholder}
            hint={t.booking.characters(descriptionLength)}
            error={errors.tattooDescription?.message}
            {...register('tattooDescription')}
          />
          <ImageUpload file={referenceImage} onChange={setReferenceImage} />
        </fieldset>
      </form>
      <BookingNav
        onBack={() => {
          saveCustomer(getValues())
          onBack()
        }}
        form={FORM_ID}
        nextDisabled={blocked}
      />
    </>
  )
}
