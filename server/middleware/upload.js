const multer = require('multer');
const httpError = require('../utils/httpError');

// Images are kept in memory, validated, then sent to Cloudinary (or saved locally)
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5 MB each, 5 files per upload
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : httpError(400, 'Only JPG, PNG or WebP images are allowed'), ok);
  },
});
