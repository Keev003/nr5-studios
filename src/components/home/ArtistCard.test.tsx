import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { artists } from '@/data/artists'
import { ArtistCard } from './ArtistCard'

describe('ArtistCard', () => {
  it.each(artists)('links "Book med $name" to the booking flow with the artist preselected', (artist) => {
    render(
      <MemoryRouter>
        <ArtistCard artist={artist} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: `Book med ${artist.name}` })).toHaveAttribute(
      'href',
      `/booking?artist=${artist.slug}`,
    )
  })
})
