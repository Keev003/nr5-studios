import { z } from 'zod'
import { nb, type Dictionary } from '@/i18n/nb'
import { toStudioDate } from './time'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const isoDate = /^\d{4}-\d{2}-\d{2}$/

/** Customer form schema with error messages in the given language. */
export function makeCustomerSchema(m: Dictionary['validation']) {
  return z.object({
    fullName: z.string().trim().min(2, m.fullName).max(100, m.nameTooLong),
    dateOfBirth: z
      .string()
      .regex(isoDate, m.dob)
      .refine((d) => d >= '1900-01-01', m.dobOld)
      .refine((d) => d <= toStudioDate(new Date()), m.dobFuture),
    email: z.string().trim().pipe(z.email(m.email)),
    phone: z
      .string()
      .trim()
      .min(1, m.phoneEmpty)
      .regex(/^\+?[\d\s-]+$/, m.phoneChars)
      .refine((p) => {
        const digits = p.replace(/\D/g, '').length
        return digits >= 8 && digits <= 15
      }, m.phone),
    tattooPlacement: z.string().trim().min(2, m.placement).max(100),
    tattooDescription: z.string().trim().min(10, m.descriptionShort).max(2000, m.descriptionLong),
  })
}

/** Language-independent validity check (messages in Norwegian). */
export const customerSchema = makeCustomerSchema(nb.validation)

export type CustomerFormValues = z.infer<typeof customerSchema>

export type ImageProblem = 'imageType' | 'imageSize'

/** Returns which rule the file breaks, or null if it is acceptable. */
export function validateReferenceImage(file: File): ImageProblem | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'imageType'
  if (file.size > MAX_IMAGE_BYTES) return 'imageSize'
  return null
}
