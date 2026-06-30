// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { useState } from 'react'
import { useKillmails } from '../hooks/useKillmails.js'
import { KillmailRow } from './KillmailRow.jsx'
import { getCharacterPortraitUrl, getCorporationLogoUrl } from '../utils/esi.js'

const TAGS = [
  { key: 'loss',   label: 'LOSS',   cssClass: 'tag-loss' },
  { key: 'recon',  label: 'Recon',  cssClass: 'tag-recon' },
  { key: 'cloaky', label: 'Cloaky', cssClass: 'tag-cloaky' },
  { key: 'npc',    label: 'NPC',    cssClass: 'tag-npc' },
]

function rowMatchesTag(km, characterId, tag) {
  const isLoss = km.victim?.character_id === characterId
  const isNpc  = km.attackers?.every(a => !a.character_id)
  switch (tag) {
    case 'loss':   return isLoss
    case 'recon':  return km.hasRecon
    case 'cloaky': return km.hasCloaky
    case 'npc':    return isNpc
    default:       return false
  }
}

export function KillmailList({ session, onLogout }) {
  const [corpMode, setCorpMode] = useState(false)
  const { killmails, metaMap, loading, error, selectedIds, toggleSelected, postSelected, posting, reload, reloading, corpInfo } = useKillmails(session.characterId, corpMode)
  const [hiddenTags, setHiddenTags] = useState(new Set())
  const [zkbUnregisteredOnly, setZkbUnregisteredOnly] = useState(false)

  function toggleTag(key) {
    setHiddenTags(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visibleKillmails = killmails.filter(km => {
    if (zkbUnregisteredOnly && km.onZkillboard !== false) return false
    return ![...hiddenTags].some(tag => rowMatchesTag(km, session.characterId, tag))
  })

  return (
    <div className="killmail-list">
      <header className="app-header">
        <h1>EVE EGOISM</h1>
        <div className="tag-filters">
          <label className="toggle-switch">
            <span className="toggle-label">zKB unregistered only</span>
            <input
              type="checkbox"
              checked={zkbUnregisteredOnly}
              onChange={() => setZkbUnregisteredOnly(v => !v)}
            />
            <span className="toggle-slider" />
          </label>
          <span className="tag-filter-sep" />
          {TAGS.map(({ key, label, cssClass }) => (
            <label key={key} className="toggle-switch">
              <span className={`tag ${cssClass}`}>{label}</span>
              <input
                type="checkbox"
                checked={!hiddenTags.has(key)}
                onChange={() => toggleTag(key)}
              />
              <span className="toggle-slider" />
            </label>
          ))}
        </div>
        <div className="user-info">
          <button onClick={reload} disabled={loading || reloading}>Reload</button>
          <span className="post-spinner-slot">{reloading && <span className="spinner" />}</span>
          <button className="post-btn" onClick={postSelected} disabled={selectedIds.size === 0 || posting}>
            {selectedIds.size > 0 ? `Post ${selectedIds.size} ${selectedIds.size === 1 ? 'Killmail' : 'Killmails'}` : 'Post Selected Killmails'}
          </button>
          <span className="post-spinner-slot">{posting && <span className="spinner" />}</span>
          <img
            src={corpMode && corpInfo
              ? getCorporationLogoUrl(corpInfo.id)
              : getCharacterPortraitUrl(session.characterId)}
            alt={corpMode && corpInfo ? corpInfo.name : session.characterName}
            width={32}
            height={32}
            style={{ borderRadius: corpMode ? '4px' : '50%', border: '1px solid #3a5070' }}
          />
          <span>{corpMode ? (corpInfo ? corpInfo.name : '…') : session.characterName}</span>
          <label className="toggle-switch" title="Switch to corporation killmails">
            <span className="toggle-label">Corp</span>
            <input type="checkbox" checked={corpMode} onChange={() => setCorpMode(v => !v)} />
            <span className="toggle-slider" />
          </label>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="km-scroll">
        {loading && <p className="status">Loading killmails…</p>}
        {error && (
          <p className="status error">
            Error: {error}
            {corpMode && error.includes('403') && <><br />You need Director role!</>}
          </p>
        )}

        {!loading && !error && killmails.length === 0 && (
          <p className="status">No killmails found.</p>
        )}

        {killmails.length > 0 && (
          <table className="km-table">
            <thead>
              <tr>
                <th>Time (UTC)</th>
                <th>zKB</th>
                <th>Solar System</th>
                <th>Victim</th>
                <th>Tags</th>
                <th>Attackers</th>
              </tr>
            </thead>
            <tbody>
              {visibleKillmails.map(km => (
                <KillmailRow
                  key={km.killmail_id}
                  killmail={km}
                  characterId={session.characterId}
                  metaMap={metaMap}
                  selected={selectedIds.has(km.killmail_id)}
                  onToggleSelected={() => toggleSelected(km.killmail_id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
