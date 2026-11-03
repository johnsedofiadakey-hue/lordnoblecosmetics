// Product photos uploaded from the website editor go to Firebase Storage under catalog/. Only the owner can
// upload (storage.rules); anyone can view, because the photos appear on the public website.
import { connectStorageEmulator, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { app } from '../../cloud/firebase.js'

const storage = getStorage(app)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS) connectStorageEmulator(storage, '127.0.0.1', 9199)

export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// Returns '' if the file is fine, otherwise a reason in plain words.
export function checkPhoto(file) {
  if (!file) return 'Choose a photo first.'
  if (!PHOTO_TYPES[file.type]) return 'Use a JPG, PNG or WebP photo.'
  if (file.size > MAX_PHOTO_BYTES) return 'This photo is bigger than 5 MB. Use a smaller one.'
  return ''
}

// Uploads a product photo and returns its public link.
export async function uploadProductPhoto(productId, file) {
  const problem = checkPhoto(file)
  if (problem) throw new Error(problem)
  const safeId = String(productId).replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'product'
  const target = ref(storage, `catalog/${safeId}/${Date.now()}.${PHOTO_TYPES[file.type]}`)
  await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' })
  return getDownloadURL(target)
}

// Short product videos go next to the product's photos. MP4 plays everywhere; iPhone MOV files may not play in
// every browser, so MP4 is recommended.
export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

export function checkVideo(file) {
  if (!file) return 'Choose a video first.'
  if (!VIDEO_TYPES[file.type]) return 'Use an MP4, WebM or MOV video.'
  if (file.size > MAX_VIDEO_BYTES) return 'This video is bigger than 50 MB. Use a shorter one.'
  return ''
}

export async function uploadProductVideo(productId, file) {
  const problem = checkVideo(file)
  if (problem) throw new Error(problem)
  const safeId = String(productId).replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'product'
  const target = ref(storage, `catalog/${safeId}/video-${Date.now()}.${VIDEO_TYPES[file.type]}`)
  await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' })
  return getDownloadURL(target)
}

// The shop's logo goes to brand/ (storage.rules). PNG or WebP keep a see-through background; no SVG.
export const LOGO_TYPES = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' }
export const MAX_LOGO_BYTES = 2 * 1024 * 1024

export function checkLogo(file) {
  if (!file) return 'Choose a logo file first.'
  if (!LOGO_TYPES[file.type]) return 'Use a PNG or WebP logo (JPG works too, but has no see-through background).'
  if (file.size > MAX_LOGO_BYTES) return 'This logo is bigger than 2 MB. Use a smaller file.'
  return ''
}

// Uploads a logo and returns its public link.
export async function uploadLogo(variant, file) {
  const problem = checkLogo(file)
  if (problem) throw new Error(problem)
  const target = ref(storage, `brand/${variant === 'light' ? 'logo-light' : 'logo'}-${Date.now()}.${LOGO_TYPES[file.type]}`)
  await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' })
  return getDownloadURL(target)
}

// Website photos (hero, category cards, closing banner, About page) go to site/ (storage.rules).
export const MAX_SITE_PHOTO_BYTES = 8 * 1024 * 1024

export function checkSitePhoto(file) {
  if (!file) return 'Choose a photo first.'
  if (!PHOTO_TYPES[file.type]) return 'Use a JPG, PNG or WebP photo.'
  if (file.size > MAX_SITE_PHOTO_BYTES) return 'This photo is bigger than 8 MB. Use a smaller one.'
  return ''
}

// Uploads a website photo and returns its public link. `kind` only names the file (hero, category, …).
export async function uploadSitePhoto(kind, file) {
  const problem = checkSitePhoto(file)
  if (problem) throw new Error(problem)
  const safeKind = String(kind).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) || 'photo'
  const target = ref(storage, `site/${safeKind}-${Date.now()}.${PHOTO_TYPES[file.type]}`)
  await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' })
  return getDownloadURL(target)
}
