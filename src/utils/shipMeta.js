// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
//
// Loads SDE-derived static JSON files built by scripts/download_sde.py.

// Force Recon Ships (groupID 833) and Combat Recon Ships (groupID 906)
const RECON_GROUP_IDS = new Set([833, 906])

let metaCache = null
let groupCache = null
let cloakyCache = null

async function loadMeta() {
  if (metaCache) return metaCache
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/ship_meta.json`)
    metaCache = res.ok ? await res.json() : {}
  } catch { metaCache = {} }
  return metaCache
}

async function loadGroups() {
  if (groupCache) return groupCache
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/ship_groups.json`)
    groupCache = res.ok ? await res.json() : {}
  } catch { groupCache = {} }
  return groupCache
}

async function loadCloaky() {
  if (cloakyCache) return cloakyCache
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/cloaky_types.json`)
    cloakyCache = res.ok ? new Set(await res.json()) : new Set()
  } catch { cloakyCache = new Set() }
  return cloakyCache
}

export async function getMetaGroupId(typeId) {
  const data = await loadMeta()
  return data[typeId] ?? 1
}

export async function isReconShip(typeId) {
  const data = await loadGroups()
  return RECON_GROUP_IDS.has(data[typeId])
}

export async function isCloakyShip(typeId) {
  const data = await loadCloaky()
  return data.has(typeId)
}
