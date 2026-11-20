import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra el nombre del producto', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'SIAP', level: 1 })).toBeInTheDocument()
  })

  it('avisa que las pantallas de producto aún no existen', () => {
    render(<App />)

    expect(screen.getByText('Esqueleto de la v1 web')).toBeInTheDocument()
  })
})
