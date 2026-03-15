import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider, useLanguage } from './LanguageProvider'

function LanguageDisplay() {
  const { language, t, setLanguage } = useLanguage()
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dashboard-label">{t.dashboard}</span>
      <span data-testid="logout-label">{t.logout}</span>
      <button onClick={() => setLanguage('th')}>Switch to TH</button>
      <button onClick={() => setLanguage('en')}>Switch to EN</button>
    </div>
  )
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to English', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('dashboard-label').textContent).toBe('Dashboard')
    expect(screen.getByTestId('logout-label').textContent).toBe('Logout')
  })

  it('switches to Thai and shows Thai labels', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByText('Switch to TH'))
    expect(screen.getByTestId('lang').textContent).toBe('th')
    expect(screen.getByTestId('logout-label').textContent).toBe('ออกจากระบบ')
  })

  it('persists language preference to localStorage', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByText('Switch to TH'))
    expect(localStorage.getItem('preferredLanguage')).toBe('th')
  })

  it('reads language preference from localStorage on mount', () => {
    localStorage.setItem('preferredLanguage', 'th')
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('th')
  })

  it('switches back to English', () => {
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>,
    )
    fireEvent.click(screen.getByText('Switch to TH'))
    fireEvent.click(screen.getByText('Switch to EN'))
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('logout-label').textContent).toBe('Logout')
  })

  it('throws when useLanguage is used outside LanguageProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<LanguageDisplay />)).toThrow()
    spy.mockRestore()
  })
})
