'use client'

import { useSounds } from '@/contexts/SoundContext'
import './ViewSwitcher.css'

export type ViewMode = 'list' | 'grid' | 'compact' | 'magazine'

interface ViewSwitcherProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  hideMagazine?: boolean
}

const ViewSwitcher = ({ currentView, onViewChange, hideMagazine = false }: ViewSwitcherProps) => {
  const { playToggleSound } = useSounds()

  const getIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'compact':
        return (
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V2zm5 0v2h6V2H5zm9 0v2h1V2h-1zm0 4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1V6zm-9 0v2h6V6H5zm-4 0v2h3V6H1zm0 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1v-2zm5 0v2h6v-2H5zm9 0v2h1v-2h-1z"/>
          </svg>
        )
      case 'list':
        return (
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
          </svg>
        )
      case 'grid':
        return (
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
          </svg>
        )
      case 'magazine':
        return (
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path d="M0 2.5A1.5 1.5 0 0 1 1.5 1h11A1.5 1.5 0 0 1 14 2.5v10.528c0 .3-.05.654-.238.972h.738a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 1 1 0v9a1.5 1.5 0 0 1-1.5 1.5H1.497A1.497 1.497 0 0 1 0 13.5v-11zM12 14c.37 0 .654-.211.853-.441.092-.106.147-.279.147-.531V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11c0 .278.223.5.497.5H12z"/>
            <path d="M2 3h10v2H2V3zm0 3h4v3H2V6zm0 4h4v1H2v-1zm0 2h4v1H2v-1zm5-6h2v1H7V6zm3 0h2v1h-2V6zM7 8h2v1H7V8zm3 0h2v1h-2V8zm-3 2h2v1H7v-1zm3 0h2v1h-2v-1zm-3 2h2v1H7v-1zm3 0h2v1h-2v-1z"/>
          </svg>
        )
      default:
        return <span />
    }
  }

  const allViews = [
    { mode: 'list' as ViewMode, label: 'List' },
    { mode: 'compact' as ViewMode, label: 'Compact' },
    { mode: 'magazine' as ViewMode, label: 'Magazine' },
    { mode: 'grid' as ViewMode, label: 'Grid' }
  ]

  const views = hideMagazine
    ? allViews.filter(view => view.mode !== 'magazine')
    : allViews

  return (
    <div className="view-switcher">
      {views.map(({ mode, label }) => (
        <button
          key={mode}
          className={`view-btn ${currentView === mode ? 'active' : ''}`}
          onClick={(e) => {
            playToggleSound()
            onViewChange(mode)
            e.currentTarget.blur()
          }}
          title={label}
          aria-label={`Switch to ${label} view`}
        >
          {getIcon(mode)}
        </button>
      ))}
    </div>
  )
}

export default ViewSwitcher
