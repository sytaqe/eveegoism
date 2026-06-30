// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { useState, useEffect } from 'react'
import { getRecentKillmails, getCorporationRecentKillmails, getCharacterDetails, getCorporationInfo, getKillmail, getSystemName, getTypeName, getCharacterName } from '../utils/esi.js'
import { getMetaGroupId, isReconShip, isCloakyShip } from '../utils/shipMeta.js'
import { isOnZkillboard, postKillmail } from '../utils/zkillboard.js'

export function useKillmails(characterId, corpMode = false) {
  const [killmails, setKillmails] = useState([])
  const [metaMap, setMetaMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [posting, setPosting] = useState(false)
  const [corpInfo, setCorpInfo] = useState(null)

  useEffect(() => {
    if (!characterId) return
    setCorpInfo(null)

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        let refs
        if (corpMode) {
          const charDetails = await getCharacterDetails(characterId)
          const corpId = charDetails.corporation_id
          const corp = await getCorporationInfo(corpId)
          if (!cancelled) setCorpInfo({ id: corpId, name: corp.name })
          refs = await getCorporationRecentKillmails(corpId)
        } else {
          refs = await getRecentKillmails(characterId)
        }
        const details = await Promise.all(
          refs.map(({ killmail_id, killmail_hash }) =>
            getKillmail(killmail_id, killmail_hash)
          )
        )

        const systemIds = [...new Set(details.map(k => k.solar_system_id))]
        const systemNames = await Promise.all(systemIds.map(id => getSystemName(id)))
        const systemMap = Object.fromEntries(systemIds.map((id, i) => [id, systemNames[i]]))

        // Resolve victim ship names and character names in parallel
        const victimShipNames = await Promise.all(
          details.map(k => k.victim.ship_type_id ? getTypeName(k.victim.ship_type_id) : Promise.resolve(null))
        )
        const victimCharNames = await Promise.all(
          details.map(k => k.victim.character_id ? getCharacterName(k.victim.character_id) : Promise.resolve(null))
        )

        // Check if any attacker flew a Recon or Cloaky ship
        const hasRecon = await Promise.all(
          details.map(k =>
            Promise.any(
              k.attackers
                .filter(a => a.ship_type_id)
                .map(a => isReconShip(a.ship_type_id).then(v => v ? Promise.resolve(true) : Promise.reject()))
            ).catch(() => false)
          )
        )
        const hasCloaky = await Promise.all(
          details.map(k =>
            Promise.any(
              k.attackers
                .filter(a => a.ship_type_id)
                .map(a => isCloakyShip(a.ship_type_id).then(v => v ? Promise.resolve(true) : Promise.reject()))
            ).catch(() => false)
          )
        )

        const enriched = details.map((k, i) => ({
          ...k,
          killmail_id: refs[i].killmail_id,
          killmail_hash: refs[i].killmail_hash,
          systemName: systemMap[k.solar_system_id],
          victimShipName: victimShipNames[i],
          victimCharName: victimCharNames[i],
          hasRecon: hasRecon[i],
          hasCloaky: hasCloaky[i],
          onZkillboard: 'pending',
        }))
        enriched.sort((a, b) => new Date(b.killmail_time) - new Date(a.killmail_time))

        if (!cancelled) setKillmails(enriched)

        await Promise.all(refs.map(async ref => {
          const result = await isOnZkillboard(ref.killmail_id).catch(() => null)
          if (!cancelled) {
            setKillmails(prev => prev.map(k =>
              k.killmail_id === ref.killmail_id ? { ...k, onZkillboard: result } : k
            ))
          }
        }))

        // Resolve meta groups from SDE static JSON (non-blocking)
        const allTypeIds = [...new Set([
          ...details.map(k => k.victim.ship_type_id).filter(Boolean),
          ...details.flatMap(k => k.attackers.map(a => a.ship_type_id).filter(Boolean)),
        ])]
        const metaGroups = await Promise.all(allTypeIds.map(id => getMetaGroupId(id)))
        const resolvedMetaMap = Object.fromEntries(allTypeIds.map((id, i) => [id, metaGroups[i]]))

        if (!cancelled) setMetaMap(resolvedMetaMap)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [characterId, corpMode])

  function toggleSelected(killmailId) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(killmailId)) next.delete(killmailId)
      else next.add(killmailId)
      return next
    })
  }

  async function postSelected() {
    const targets = killmails.filter(k => selectedIds.has(k.killmail_id))
    setPosting(true)
    try {
      const results = await Promise.all(
        targets.map(k =>
          postKillmail(k.killmail_id, k.killmail_hash)
            .catch(() => null)
        )
      )
      setKillmails(prev => {
        const resultMap = new Map(targets.map((k, i) => [k.killmail_id, results[i]]))
        return prev.map(k =>
          resultMap.has(k.killmail_id) ? { ...k, onZkillboard: resultMap.get(k.killmail_id) } : k
        )
      })
      setSelectedIds(prev => {
        const next = new Set(prev)
        targets.forEach(k => next.delete(k.killmail_id))
        return next
      })
    } finally {
      setPosting(false)
    }
  }

  return { killmails, metaMap, loading, error, selectedIds, toggleSelected, postSelected, posting, corpInfo }
}
