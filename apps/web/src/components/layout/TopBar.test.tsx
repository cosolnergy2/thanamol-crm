import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar } from './TopBar'
import { LanguageProvider } from '@/providers/LanguageProvider'

function renderTopBar(props: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const defaults = {
    isSidebarOpen: false,
    isSidebarCollapsed: false,
    onToggleSidebar: vi.fn(),
    onToggleMobileSidebar: vi.fn(),
    notificationCount: 0,
  }
  return render(
    <LanguageProvider>
      <TopBar {...defaults} {...props} />
    </LanguageProvider>,
  )
}

describe('TopBar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the search input', () => {
    renderTopBar()
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })

  it('renders the notification bell', () => {
    renderTopBar()
    const bell = screen.getByRole('button', { name: /notifications/i })
    expect(bell).toBeTruthy()
  })

  it('shows notification badge when count > 0', () => {
    renderTopBar({ notificationCount: 3 })
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('shows 9+ when notification count exceeds 9', () => {
    renderTopBar({ notificationCount: 15 })
    expect(screen.getByText('9+')).toBeTruthy()
  })

  it('does not show badge when notification count is 0', () => {
    renderTopBar({ notificationCount: 0 })
    expect(screen.queryByText('0')).toBeNull()
  })

  it('renders EN/TH language switcher', () => {
    renderTopBar()
    expect(screen.getByText('EN')).toBeTruthy()
    expect(screen.getByText('TH')).toBeTruthy()
  })

  it('toggles language from EN to TH when language button is clicked', () => {
    renderTopBar()
    const langButton = screen.getByRole('button', { name: /switch to thai/i })
    fireEvent.click(langButton)
    expect(localStorage.getItem('preferredLanguage')).toBe('th')
  })

  it('calls onToggleSidebar when desktop menu button is clicked', () => {
    const onToggleSidebar = vi.fn()
    renderTopBar({ onToggleSidebar })
    // Desktop button is hidden on mobile viewport; grab by aria-label
    const buttons = screen.getAllByRole('button', { name: /collapse sidebar|expand sidebar/i })
    fireEvent.click(buttons[0])
    expect(onToggleSidebar).toHaveBeenCalledOnce()
  })

  it('calls onToggleMobileSidebar when mobile hamburger is clicked', () => {
    const onToggleMobileSidebar = vi.fn()
    renderTopBar({ onToggleMobileSidebar })
    const buttons = screen.getAllByRole('button', { name: /open sidebar|close sidebar/i })
    fireEvent.click(buttons[0])
    expect(onToggleMobileSidebar).toHaveBeenCalledOnce()
  })
})
