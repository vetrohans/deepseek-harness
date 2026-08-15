import { useState } from 'react'
import type { ReactNode } from 'react'
import { IconDownloadOutline16, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { SessionLogDownloadDialog, type SessionLogDownloadDialogProps } from './Dialog.tsx'
import css from './HeaderAction.module.css'

/** lucide square-terminal glyph (square-terminal.svg): the session menu affordance. */
function SquareTerminalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7 11 2-2-2-2" />
      <path d="M11 13h4" />
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    </svg>
  )
}

/**
 * Session header menu: a square-terminal trigger opening 轨迹 (⇄ 对话) and the
 * Session log download — replacing the old view tabs and the standalone
 * "Session log" export button. The second row toggles between the trajectory
 * view and the default chat view, since the tab ring is no longer rendered.
 */
export function SessionLogDownloadHeaderAction(props: SessionLogDownloadDialogProps): ReactNode {
  const { sessionId, useSessionLogDownload, request, setView, activeViewId, t } = props
  const entry = useSessionLogDownload(state => state.bySession[String(sessionId)])
  const busy = entry?.status === 'downloading'
  const [menuOpen, setMenuOpen] = useState(false)
  const inTrajectory = activeViewId === 'trajectory'
  const items = [
    { id: 'download', label: t('menu.downloadSessionLog'), icon: <IconDownloadOutline16 size={16} /> },
    // 'chat' is the stable default conversation view id (ui-conversation registers it).
    { id: 'view', label: inTrajectory ? t('menu.conversation') : t('menu.trajectory'), icon: <SquareTerminalIcon size={16} /> },
  ]

  return (
    <>
      <Menu
        open={menuOpen}
        onClose={() => { setMenuOpen(false) }}
        items={items}
        onSelect={(id) => {
          setMenuOpen(false)
          if (id === 'download') void request(sessionId)
          else if (id === 'view') setView(inTrajectory ? 'chat' : 'trajectory')
        }}
        anchor={(
          <button
            type="button"
            className={css.sessionMenuButton}
            aria-label={t('menu.aria')}
            aria-busy={busy}
            disabled={busy}
            onClick={() => { setMenuOpen(v => !v) }}
          >
            <SquareTerminalIcon size={16} />
          </button>
        )}
      />
      <SessionLogDownloadDialog {...props} />
    </>
  )
}
