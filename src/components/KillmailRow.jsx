// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { getCharacterPortraitUrl } from '../utils/esi.js'
import { ShipIcon } from './ShipIcon.jsx'

function formatTime(isoString) {
  const d = new Date(isoString)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}/${m}/${day} ${h}:${min}:${s} UTC`
}

export function KillmailRow({ killmail, characterId, metaMap, selected, onToggleSelected }) {
  const { killmail_time, systemName, victim, attackers, victimShipName, victimCharName, hasRecon, hasCloaky, onZkillboard } = killmail
  const isNpc = attackers.every(a => !a.character_id)
  const isLoss = victim.character_id === characterId
  const victimShipId = victim.ship_type_id
  // Deduplicate by ship_type_id; mark entry as final_blow if any attacker with that ship dealt it
  const attackerGroups = []
  const seen = new Map()
  for (const a of attackers) {
    if (!a.ship_type_id) continue
    if (seen.has(a.ship_type_id)) {
      if (a.final_blow) seen.get(a.ship_type_id).final_blow = true
      seen.get(a.ship_type_id).count++
    } else {
      const entry = { ship_type_id: a.ship_type_id, final_blow: a.final_blow, count: 1 }
      seen.set(a.ship_type_id, entry)
      attackerGroups.push(entry)
    }
  }

  return (
    <tr className={`killmail-row ${isLoss ? 'km-loss' : 'km-kill'}`}>
      <td className="km-time">{formatTime(killmail_time)}</td>
      <td className="km-zkb">
        {onZkillboard === 'pending' && <span className="spinner" />}
        {onZkillboard === true && (
          <a
            className="zkb-registered"
            href={`https://zkillboard.com/kill/${killmail.killmail_id}/`}
            target="_blank"
            rel="noreferrer"
          >✔</a>
        )}
        {onZkillboard === false && (
          <input type="checkbox" checked={selected} onChange={onToggleSelected} />
        )}
        {onZkillboard === null && <span className="zkb-error">error</span>}
      </td>
      <td className="km-system">{systemName}</td>
      <td className="km-victim">
        <div className="victim-icons">
          {victimShipId && (
            <ShipIcon typeId={victimShipId} size={64} metaGroupId={metaMap[victimShipId]} />
          )}
          {victim.character_id && (
            <a
              href={`https://zkillboard.com/character/${victim.character_id}/`}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={getCharacterPortraitUrl(victim.character_id)}
                alt={`pilot ${victim.character_id}`}
                width={64}
                height={64}
                style={{ borderRadius: 4, border: '1px solid #1e2d4a', display: 'block' }}
              />
            </a>
          )}
          <div className="victim-names">
            {victimShipName && <span className="victim-ship-name">{victimShipName}</span>}
            {victimCharName && (
              <a
                className="victim-char-name"
                href={`https://zkillboard.com/character/${victim.character_id}/`}
                target="_blank"
                rel="noreferrer"
              >
                {victimCharName}
              </a>
            )}
          </div>
        </div>
      </td>
      <td className="km-tags">
        <div className="km-tags-inner">
          {isLoss && <span className="tag tag-loss">LOSS</span>}
          {hasRecon && <span className="tag tag-recon">Recon</span>}
          {hasCloaky && <span className="tag tag-cloaky">Cloaky</span>}
          {isNpc && <span className="tag tag-npc">NPC</span>}
        </div>
      </td>
      <td className="km-attackers">
        <div className="attacker-icons">
          {attackerGroups.map((a) => (
            <div key={a.ship_type_id} style={{ position: 'relative', display: 'inline-block' }}>
              <ShipIcon
                typeId={a.ship_type_id}
                size={40}
                metaGroupId={metaMap[a.ship_type_id]}
                className={a.final_blow ? 'final-blow' : ''}
                title={a.final_blow ? 'Final blow' : undefined}
              />
              {a.count > 1 && (
                <span className="attacker-count">x{a.count}</span>
              )}
            </div>
          ))}
        </div>
      </td>
    </tr>
  )
}
