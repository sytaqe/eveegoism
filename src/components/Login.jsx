// SPDX-License-Identifier: CC0-1.0
// This file is released into the public domain under the CC0 1.0 Universal license.
import { startLogin } from '../utils/sso.js'

export function Login() {
  return (
    <div className="login-page">
      <h1>EVE EGOISM</h1>
      <p>Manage your recent killmails.</p>
      <button className="login-btn" onClick={startLogin}>
        Login with EVE Online
      </button>
    </div>
  )
}
