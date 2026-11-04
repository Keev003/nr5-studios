import { validateDay } from './validateDay'

const w = (startTime: string, endTime: string) => ({ dayOfWeek: 1 as const, startTime, endTime })

describe('validateDay', () => {
  it('accepts a normal day and split shifts', () => {
    expect(validateDay([w('10:00', '17:00')])).toBeNull()
    expect(validateDay([w('13:00', '17:00'), w('09:00', '12:00')])).toBeNull()
    expect(validateDay([w('09:00', '12:00'), w('12:00', '15:00')])).toBeNull()
  })

  it('rejects reversed, empty and overlapping windows', () => {
    expect(validateDay([w('17:00', '10:00')])).toMatch(/etter starttid/)
    expect(validateDay([w('', '10:00')])).toMatch(/Fyll inn/)
    expect(validateDay([w('09:00', '13:00'), w('12:00', '15:00')])).toMatch(/overlapper/)
  })
})
