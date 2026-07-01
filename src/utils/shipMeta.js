// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
//
// Loads SDE-derived static JSON files built by scripts/download_sde.py.

// Force Recon Ships (groupID 833) and Combat Recon Ships (groupID 906)
const RECON_GROUP_IDS = new Set([833, 906])

const metaPromise = fetch(`${import.meta.env.BASE_URL}data/ship_meta.json`)
  .then(r => r.ok ? r.json() : {}).catch(() => ({}))

const groupPromise = fetch(`${import.meta.env.BASE_URL}data/ship_groups.json`)
  .then(r => r.ok ? r.json() : {}).catch(() => ({}))

const cloakyPromise = fetch(`${import.meta.env.BASE_URL}data/cloaky_types.json`)
  .then(r => r.ok ? r.json() : []).then(arr => new Set(arr)).catch(() => new Set())

export async function getMetaGroupId(typeId) {
  const data = await metaPromise
  return data[typeId] ?? 1
}

export async function isReconShip(typeId) {
  const data = await groupPromise
  return RECON_GROUP_IDS.has(data[typeId])
}

export async function isCloakyShip(typeId) {
  const data = await cloakyPromise
  return data.has(typeId)
}
