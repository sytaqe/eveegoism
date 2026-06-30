// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { getSession, refreshAccessToken } from './sso.js'

const ESI_BASE = 'https://esi.evetech.net/latest'

async function authedFetchRaw(url) {
  let session = getSession()
  if (!session?.accessToken) {
    const ok = await refreshAccessToken()
    if (!ok) throw new Error('Not authenticated')
    session = getSession()
  }

  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (response.status === 401) {
    const ok = await refreshAccessToken()
    if (!ok) throw new Error('Not authenticated')
    session = getSession()
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
  }

  if (!response.ok) throw new Error(`ESI error: ${response.status}`)
  return response
}

async function authedFetch(url) {
  return (await authedFetchRaw(url)).json()
}

export async function getRecentKillmails(characterId) {
  const refs = []
  let page = 1
  while (true) {
    const res = await authedFetchRaw(
      `${ESI_BASE}/characters/${characterId}/killmails/recent/?datasource=tranquility&page=${page}`
    )
    const pageData = await res.json()
    refs.push(...pageData)
    const totalPages = parseInt(res.headers.get('X-Pages') ?? '1', 10)
    if (page >= totalPages) break
    page++
  }
  return refs
}

export async function getKillmail(killmailId, killmailHash) {
  const response = await fetch(`${ESI_BASE}/killmails/${killmailId}/${killmailHash}/?datasource=tranquility`)
  if (!response.ok) throw new Error(`ESI error: ${response.status}`)
  return response.json()
}

const systemNameCache = new Map()

export async function getSystemName(systemId) {
  if (systemNameCache.has(systemId)) return systemNameCache.get(systemId)
  const response = await fetch(`${ESI_BASE}/universe/systems/${systemId}/?datasource=tranquility&language=en`)
  if (!response.ok) return String(systemId)
  const data = await response.json()
  systemNameCache.set(systemId, data.name)
  return data.name
}

export function getTypeIconUrl(typeId) {
  return `https://images.evetech.net/types/${typeId}/render?size=64`
}

const typeNameCache = new Map()

export async function getTypeName(typeId) {
  if (typeNameCache.has(typeId)) return typeNameCache.get(typeId)
  const res = await fetch(`${ESI_BASE}/universe/types/${typeId}/?datasource=tranquility&language=en`)
  const name = res.ok ? (await res.json()).name : String(typeId)
  typeNameCache.set(typeId, name)
  return name
}

const characterNameCache = new Map()

export async function getCharacterName(characterId) {
  if (characterNameCache.has(characterId)) return characterNameCache.get(characterId)
  const res = await fetch(`${ESI_BASE}/characters/${characterId}/?datasource=tranquility`)
  const name = res.ok ? (await res.json()).name : String(characterId)
  characterNameCache.set(characterId, name)
  return name
}

export function getCharacterPortraitUrl(characterId) {
  return `https://images.evetech.net/characters/${characterId}/portrait?size=64`
}

export function getCorporationLogoUrl(corporationId) {
  return `https://images.evetech.net/corporations/${corporationId}/logo?size=64`
}

export async function getCharacterDetails(characterId) {
  const res = await fetch(`${ESI_BASE}/characters/${characterId}/?datasource=tranquility`)
  if (!res.ok) throw new Error(`ESI error: ${res.status}`)
  return res.json()
}

export async function getCorporationInfo(corporationId) {
  const res = await fetch(`${ESI_BASE}/corporations/${corporationId}/?datasource=tranquility`)
  if (!res.ok) throw new Error(`ESI error: ${res.status}`)
  return res.json()
}

export async function getCorporationRecentKillmails(corporationId) {
  const refs = []
  let page = 1
  while (true) {
    const res = await authedFetchRaw(
      `${ESI_BASE}/corporations/${corporationId}/killmails/recent/?datasource=tranquility&page=${page}`
    )
    const pageData = await res.json()
    refs.push(...pageData)
    const totalPages = parseInt(res.headers.get('X-Pages') ?? '1', 10)
    if (page >= totalPages) break
    page++
  }
  return refs
}

