import multer from 'multer';
import { config } from '../config/index.js';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    // Preliminary MIME check; deep magic-byte inspection is performed on buffer
    if (config.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF, JPG, and PNG are allowed.`));
    }
  },
});
