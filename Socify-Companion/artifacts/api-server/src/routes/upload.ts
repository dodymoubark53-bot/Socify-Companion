import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error("Only images and videos are allowed"));
  },
});

async function tryCloudinaryUpload(filePath: string, originalname: string): Promise<string | null> {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];

  if (!cloudName || !apiKey || !apiSecret) return null;

  try {
    const cloudinary = await import("cloudinary");
    cloudinary.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const result = await cloudinary.v2.uploader.upload(filePath, {
      resource_type: "auto",
      folder: "socify",
    });
    fs.unlinkSync(filePath);
    return result.secure_url;
  } catch {
    return null;
  }
}

router.post("/upload", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file provided" });
      return;
    }

    const cloudinaryUrl = await tryCloudinaryUpload(req.file.path, req.file.originalname);

    if (cloudinaryUrl) {
      res.json({ url: cloudinaryUrl, provider: "cloudinary", filename: req.file.originalname });
      return;
    }

    const localUrl = `/api/uploads/${req.file.filename}`;
    res.json({ url: localUrl, provider: "local", filename: req.file.originalname });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

router.get("/uploads/:filename", (req, res) => {
  const filename = req.params["filename"];
  if (!filename || filename.includes("..")) {
    res.status(400).json({ message: "Invalid filename" });
    return;
  }
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
