// LOCAL EMULATORS ONLY. Creates a test owner account on the Auth emulator and lists it in /admins, so you can
// sign in at http://localhost:5182/admin/ and press "Set up the shop as owner". No products are created: add them
// in the admin like the owner will. Refuses to run unless it is talking to the demo-lordnoble emulators.
//
//   npm run dev:emulators   (one terminal)
//   npm run seed:emulators  (another)
//
// Test login (emulator only): owner@lordnoble.test / emulator-owner-2026

const PROJECT = 'demo-lordnoble'
const AUTH = `http://127.0.0.1:${process.env.LORDINA_AUTH_EMULATOR_PORT || 9099}`
const FIRESTORE = `http://127.0.0.1:${process.env.LORDINA_FIRESTORE_EMULATOR_PORT || 8080}`
const EMAIL = 'owner@lordnoble.test'
const PASSWORD = 'emulator-owner-2026'

async function json(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`)
  return body
}

const ping = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/config`).catch(() => null)
if (!ping?.ok) {
  console.error(`The Auth emulator is not running at ${AUTH} for project demo-lordnoble. Start it with \`npm run dev:emulators\`.`)
  process.exit(1)
}

let uid
try {
  const created = await json(await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, displayName: 'Test Owner', returnSecureToken: true }),
  }))
  uid = created.localId
} catch {
  const signedIn = await json(await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  }))
  uid = signedIn.localId
}

// "Bearer owner" bypasses security rules on the Firestore emulator only.
await json(await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/admins/${uid}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
  body: JSON.stringify({ fields: { email: { stringValue: EMAIL }, note: { stringValue: 'Emulator test owner' } } }),
}))

console.log(`Test owner ready on the emulators: ${EMAIL} (uid ${uid}). Sign in at http://localhost:5182/admin/`)
