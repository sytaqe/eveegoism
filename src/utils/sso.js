// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.

const EVE_SSO_AUTH_URL = 'https://login.eveonline.com/v2/oauth/authorize'
const EVE_SSO_TOKEN_URL = 'https://login.eveonline.com/v2/oauth/token'
const EVE_SSO_VERIFY_URL = 'https://login.eveonline.com/oauth/verify'
const CLIENT_ID = import.meta.env.VITE_EVE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin + import.meta.env.BASE_URL
const SCOPES = 'esi-killmails.read_killmails.v1 esi-killmails.read_corporation_killmails.v1'

const COOKIE_ACCESS_TOKEN = 'eve_access_token'
const COOKIE_REFRESH_TOKEN = 'eve_refresh_token'
const COOKIE_CHARACTER_ID = 'eve_character_id'
const COOKIE_CHARACTER_NAME = 'eve_character_name'

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64urlEncode(array)
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(digest)
}

export async function startLogin() {
  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = base64urlEncode(crypto.getRandomValues(new Uint8Array(16)))

  sessionStorage.setItem('pkce_verifier', verifier)
  sessionStorage.setItem('pkce_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${EVE_SSO_AUTH_URL}?${params}`
}

export async function handleCallback(code, returnedState) {
  const verifier = sessionStorage.getItem('pkce_verifier')
  const expectedState = sessionStorage.getItem('pkce_state')

  if (returnedState !== expectedState) throw new Error('State mismatch')

  const response = await fetch(EVE_SSO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  if (!response.ok) throw new Error('Token exchange failed')
  const tokens = await response.json()

  const verify = await fetch(EVE_SSO_VERIFY_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const identity = await verify.json()

  setCookie(COOKIE_ACCESS_TOKEN, tokens.access_token, 20)
  setCookie(COOKIE_REFRESH_TOKEN, tokens.refresh_token, 60 * 24 * 90)
  setCookie(COOKIE_CHARACTER_ID, String(identity.CharacterID), 60 * 24 * 90)
  setCookie(COOKIE_CHARACTER_NAME, identity.CharacterName, 60 * 24 * 90)

  sessionStorage.removeItem('pkce_verifier')
  sessionStorage.removeItem('pkce_state')

  return { characterId: identity.CharacterID, characterName: identity.CharacterName }
}

export async function refreshAccessToken() {
  const refreshToken = getCookie(COOKIE_REFRESH_TOKEN)
  if (!refreshToken) return false

  const response = await fetch(EVE_SSO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    logout()
    return false
  }

  const tokens = await response.json()
  setCookie(COOKIE_ACCESS_TOKEN, tokens.access_token, 20)
  if (tokens.refresh_token) {
    setCookie(COOKIE_REFRESH_TOKEN, tokens.refresh_token, 60 * 24 * 90)
  }
  return true
}

export function getSession() {
  const accessToken = getCookie(COOKIE_ACCESS_TOKEN)
  const characterId = getCookie(COOKIE_CHARACTER_ID)
  const characterName = getCookie(COOKIE_CHARACTER_NAME)
  if (!characterId) return null
  return { accessToken, characterId: Number(characterId), characterName }
}

export function logout() {
  deleteCookie(COOKIE_ACCESS_TOKEN)
  deleteCookie(COOKIE_REFRESH_TOKEN)
  deleteCookie(COOKIE_CHARACTER_ID)
  deleteCookie(COOKIE_CHARACTER_NAME)
}

function setCookie(name, value, minutes) {
  const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}
