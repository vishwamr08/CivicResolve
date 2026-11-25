/**
 * CivicResolve - Secure Profile Photo Service
 *
 * Implements strict magic-byte signature validation, EXIF-stripping server-side
 * image resizing/compression via Sharp, and persistent database storage
 * compatible with SQLite, Render Persistent Disks, and Managed PostgreSQL.
 */

const multer = require('multer');
const sharp = require('sharp');
const db = require('./db');

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

// Memory-only Multer transport so untrusted binary uploads never touch disk
const avatarUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: 1
  }
}).single('photo');

/**
 * Inspect raw binary magic bytes to determine real image format.
 * Never trusts client-provided Content-Type headers or filenames.
 */
function detectImageMagicFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Validate magic bytes, decode image structure via Sharp, strip metadata/EXIF,
 * resize to crisp 256x256 square cover, and compress as WebP.
 */
async function validateAndProcessProfilePhoto(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('No image file uploaded.');
  }

  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error('Profile photo exceeds the 2 MB maximum size limit.');
  }

  const magicFormat = detectImageMagicFormat(buffer);
  if (!magicFormat || !ALLOWED_FORMATS.has(magicFormat)) {
    throw new Error('Invalid image signature. Only genuine JPEG, PNG, and WebP images are permitted.');
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new Error('Uploaded file could not be decoded as a valid image.');
  }

  if (!metadata || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error('Unsupported or corrupted image format. Only JPEG, PNG, and WebP are allowed.');
  }

  if (!metadata.width || !metadata.height || metadata.width > 10000 || metadata.height > 10000) {
    throw new Error('Image dimensions are invalid or exceed safe limits.');
  }

  // Re-encode strips all EXIF, GPS location tags, embedded comments, and non-image payloads
  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize(256, 256, {
      fit: 'cover',
      position: 'centre'
    })
    .webp({ quality: 82 })
    .toBuffer();

  return {
    dataBase64: processedBuffer.toString('base64'),
    mimeType: 'image/webp',
    byteLength: processedBuffer.length,
    width: 256,
    height: 256
  };
}

/**
 * Save processed avatar into PostgreSQL/SQLite persistent database.
 */
async function saveUserProfilePhoto(userType, userId, fileBuffer) {
  if (userType !== 'citizen' && userType !== 'admin') {
    throw new Error('Invalid user type.');
  }

  const processed = await validateAndProcessProfilePhoto(fileBuffer);
  const versionTs = Date.now();
  const safeUrl = `/api/avatars/${userType}/${userId}?v=${versionTs}`;
  const table = userType === 'citizen' ? 'citizens' : 'admins';

  await db.prepare(`
    UPDATE ${table}
    SET profile_photo_data = ?,
        profile_photo_mime = ?,
        profile_photo_url = ?,
        profile_photo_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(processed.dataBase64, processed.mimeType, safeUrl, userId);

  return {
    profile_photo_url: safeUrl,
    profile_photo_mime: processed.mimeType,
    byteLength: processed.byteLength
  };
}

/**
 * Remove user avatar and restore default initials/role avatar.
 */
async function removeUserProfilePhoto(userType, userId) {
  if (userType !== 'citizen' && userType !== 'admin') {
    throw new Error('Invalid user type.');
  }

  const table = userType === 'citizen' ? 'citizens' : 'admins';

  await db.prepare(`
    UPDATE ${table}
    SET profile_photo_data = NULL,
        profile_photo_mime = NULL,
        profile_photo_url = NULL,
        profile_photo_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);

  return { profile_photo_url: null };
}

/**
 * Fetch binary avatar buffer safely by validated userType and integer userId.
 */
async function getUserProfilePhoto(userType, userId) {
  if ((userType !== 'citizen' && userType !== 'admin') || !/^\d+$/.test(String(userId))) {
    return null;
  }

  const table = userType === 'citizen' ? 'citizens' : 'admins';
  const row = await db.prepare(`
    SELECT profile_photo_data, profile_photo_mime, profile_photo_updated_at
    FROM ${table}
    WHERE id = ?
  `).get(parseInt(userId, 10));

  if (!row || !row.profile_photo_data) {
    return null;
  }

  return {
    buffer: Buffer.from(row.profile_photo_data, 'base64'),
    mimeType: row.profile_photo_mime || 'image/webp',
    updatedAt: row.profile_photo_updated_at
  };
}

/**
 * Wrapper middleware for crisp Multer error messages.
 */
function handleAvatarUpload(req, res, next) {
  avatarUploadMiddleware(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Profile photo exceeds the 2 MB maximum upload limit.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    return res.status(400).json({ error: err.message || 'Invalid photo upload.' });
  });
}

module.exports = {
  MAX_PHOTO_BYTES,
  detectImageMagicFormat,
  validateAndProcessProfilePhoto,
  saveUserProfilePhoto,
  removeUserProfilePhoto,
  getUserProfilePhoto,
  handleAvatarUpload
};
