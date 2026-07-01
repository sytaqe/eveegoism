// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { useState } from 'react'
import { getTypeIconUrl } from '../utils/esi.js'

// metaGroupId from SDE invMetaTypes:
//   1 = Tech I (no overlay)
//   2 = Tech II
//   3 = Storyline
//   4 = Faction
//   5 = Officer
//   6 = Deadspace
const OVERLAY_COLORS = {
  2: '#9E6101', // T2 — orange
  3: '#446E1E', // Storyline — light green
  4: '#11470D', // Faction — dark green
  5: '#340E73', // Officer — purple
  6: '#29478B', // Deadspace — blue
}

function MetaOverlay({ metaGroupId, size }) {
  const color = OVERLAY_COLORS[metaGroupId]
  if (!color) return null

  const r = Math.max(2, Math.round(size * 0.11))

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <polygon
        points={`0,0 ${r * 2},0 0,${r * 2}`}
        fill={color}
        opacity="0.9"
      />
    </svg>
  )
}

function UnknownShipIcon({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: 'block', borderRadius: 4, border: '1px solid #1e2d4a' }}
    >
      <rect width="40" height="40" fill="#000" />
      <text
        x="20"
        y="28"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill="#fff"
        fontFamily="sans-serif"
      >?</text>
    </svg>
  )
}

export function ShipIcon({ typeId, size, metaGroupId, className = '', ...props }) {
  const [errored, setErrored] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
      {errored ? (
        <UnknownShipIcon size={size} />
      ) : (
        <img
          src={getTypeIconUrl(typeId)}
          alt={`ship ${typeId}`}
          width={size}
          height={size}
          style={{ display: 'block', borderRadius: 4, border: '1px solid #1e2d4a' }}
          className={className}
          onError={() => setErrored(true)}
          {...props}
        />
      )}
      {!errored && <MetaOverlay metaGroupId={metaGroupId ?? 1} size={size} />}
    </div>
  )
}
