import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Stepper } from './Stepper'

const steps = ['Artist', 'Tjeneste', 'Tidspunkt'] as const

describe('Stepper', () => {
  it('marks the active step and lets the user jump back to completed steps only', async () => {
    const onStepClick = vi.fn()
    render(<Stepper steps={steps} current={1} onStepClick={onStepClick} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toHaveAttribute('aria-current', 'step')
    expect(buttons[2]).toBeDisabled()

    await userEvent.click(buttons[0]!)
    expect(onStepClick).toHaveBeenCalledWith(0)
  })
})
