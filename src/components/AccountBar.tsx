import type { AuthProvider, CloudUser, SyncStatus } from '../lib/cloud'
import { authStartUrl } from '../lib/cloud'

interface Props {
  user: CloudUser | null
  configured: boolean
  syncStatus: SyncStatus
  syncError: string | null
  onLogout: () => void
}

export function AccountBar({
  user,
  configured,
  syncStatus,
  syncError,
  onLogout,
}: Props) {
  const statusLabel: Record<SyncStatus, string> = {
    'local-only': 'Saved on this device',
    syncing: 'Syncing…',
    synced: 'Synced to cloud',
    error: syncError ?? 'Sync error',
  }

  return (
    <div className="account-bar" aria-label="Cloud account">
      {user ? (
        <div className="account-signed-in">
          <div className="account-identity">
            <span className="account-provider">{providerLabel(user.provider)}</span>
            <span className="account-name">{user.name || user.email}</span>
            {user.email && user.name ? (
              <span className="account-email">{user.email}</span>
            ) : null}
          </div>
          <p className={`account-sync status-${syncStatus}`}>{statusLabel[syncStatus]}</p>
          <button type="button" className="btn ghost compact" onClick={onLogout}>
            Disconnect
          </button>
        </div>
      ) : (
        <div className="account-connect">
          <p className="account-prompt">
            {configured
              ? 'Connect a cloud account to sync progress across devices.'
              : 'Cloud sync is not configured on this deployment yet.'}
          </p>
          <div className="account-actions">
            <a
              className={`btn compact ${configured ? '' : 'disabled'}`}
              href={configured ? authStartUrl('google') : undefined}
              aria-disabled={!configured}
              onClick={(e) => {
                if (!configured) e.preventDefault()
              }}
            >
              Connect Google
            </a>
            <a
              className={`btn compact ${configured ? '' : 'disabled'}`}
              href={configured ? authStartUrl('microsoft') : undefined}
              aria-disabled={!configured}
              onClick={(e) => {
                if (!configured) e.preventDefault()
              }}
            >
              Connect Microsoft
            </a>
          </div>
          <p className={`account-sync status-${syncStatus}`}>{statusLabel[syncStatus]}</p>
        </div>
      )}
    </div>
  )
}

function providerLabel(provider: AuthProvider): string {
  return provider === 'google' ? 'Google' : 'Microsoft'
}
