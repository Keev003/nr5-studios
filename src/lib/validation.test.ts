import { customerSchema, validateReferenceImage } from './validation'

const valid = {
  fullName: 'Kari Nordmann',
  dateOfBirth: '1995-04-12',
  email: 'kari@example.com',
  phone: '+47 412 34 567',
  tattooPlacement: 'Venstre underarm',
  tattooDescription: 'En liten botanisk linjetegning av en kvist.',
}

describe('customerSchema', () => {
  it('accepts a complete form', () => {
    expect(customerSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['fullName', ''],
    ['dateOfBirth', ''],
    ['dateOfBirth', '2999-01-01'],
    ['email', 'ikke-en-epost'],
    ['phone', '123'],
    ['phone', 'tlf 41234567'],
    ['tattooPlacement', ''],
    ['tattooDescription', 'kort'],
  ])('rejects invalid %s (%j)', (field, value) => {
    const result = customerSchema.safeParse({ ...valid, [field]: value })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual([field])
  })
})

describe('validateReferenceImage', () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], 'ref', { type })

  it('accepts JPG, PNG and WebP up to 10 MB', () => {
    expect(validateReferenceImage(file('image/jpeg', 1000))).toBeNull()
    expect(validateReferenceImage(file('image/webp', 10 * 1024 * 1024))).toBeNull()
  })

  it('rejects other types and oversized files', () => {
    expect(validateReferenceImage(file('image/gif', 1000))).toBe('imageType')
    expect(validateReferenceImage(file('image/png', 10 * 1024 * 1024 + 1))).toBe('imageSize')
  })
})
