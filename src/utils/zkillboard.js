// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.

const ZKB_CACHE_KEY = 'zkb_registered_ids'

function loadCache() {
  try {
    return new Set(JSON.parse(localStorage.getItem(ZKB_CACHE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveToCache(killmailId) {
  try {
    const cache = loadCache()
    cache.add(killmailId)
    localStorage.setItem(ZKB_CACHE_KEY, JSON.stringify([...cache]))
  } catch {
    // localStorage unavailable — silently skip
  }
}

/**
 * Returns true if the killmail is registered on zKillboard, false otherwise.
 * Checks localStorage cache first; on confirmed registration saves to cache.
 */
export async function isOnZkillboard(killmailId) {
  if (loadCache().has(killmailId)) return true

  const res = await fetch(`https://zkillboard.com/api/killID/${killmailId}/`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`zkillboard API error: ${res.status}`)
  const data = await res.json()
  const registered = !(Array.isArray(data) && data.length === 0)
  if (registered) saveToCache(killmailId)
  return registered
}

/**
 * Submits a killmail to zKillboard via the posting API.
 * https://github.com/zKillboard/zKillboard/wiki/API-(Posting-Killmails)
 */
export async function postKillmail(killmailId, killmailHash) {
  const killmailurl = `https://esi.evetech.net/killmails/${killmailId}/${killmailHash}/`
  await fetch('https://zkillboard.com/post/', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ killmailurl }),
  })
  return true
}
