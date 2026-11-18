import "dotenv/config";
import express from "express";
import multer from "multer";
import { fal } from "@fal-ai/client";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = "fal-ai/wan/v2.7/edit-video";
const MAX_BYTES = 100 * 1024 * 1024;

if (process.env.FAL_KEY) fal.config({ credentials: process.env.FAL_KEY });
else console.warn("FAL_KEY is missing; conversions are disabled.");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (["video/mp4", "video/quicktime"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Please upload an MP4 or MOV video."));
  }
});

app.use(express.static("public"));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.FAL_KEY), model: MODEL });
});

app.post("/api/convert", upload.single("video"), async (req, res) => {
  try {
    if (!process.env.FAL_KEY) return res.status(503).json({ error: "AI service is not configured yet." });
    if (!req.file) return res.status(400).json({ error: "Choose a video first." });

    const prompt = [
      "Transform the entire input video into a polished 2D animated cartoon.",
      "Use clean hand-drawn outlines, appealing cel shading, coherent illustrated backgrounds,",
      "consistent character designs, expressive but faithful faces, and smooth animation.",
      "Preserve the original scene composition, subjects, clothing, actions, timing, camera movement,",
      "framing and sequence of events as closely as possible. Do not add new characters or scenes.",
      "Keep the visual style consistent across every frame. Avoid flicker, morphing and unwanted text."
    ].join(" ");

    const videoFile = new File([req.file.buffer], req.file.originalname || "reference.mp4", { type: req.file.mimetype });
    const videoUrl = await fal.storage.upload(videoFile);
    const result = await fal.subscribe(MODEL, {
      input: { prompt, video_url: videoUrl, resolution: "720p", audio_setting: "origin", enable_safety_checker: true },
      logs: true
    });

    const output = result?.data?.video;
    if (!output?.url) return res.status(502).json({ error: "AI service did not return a finished video. Please try again." });
    res.json({ ok: true, videoUrl: output.url, fileName: output.file_name || "animated-video.mp4" });
  } catch (err) {
    console.error("Conversion error:", err);
    res.status(400).json({ error: err?.message || "Conversion failed." });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ error: "File is over the 100 MB limit." });
  res.status(400).json({ error: err.message || "Upload failed." });
});

app.listen(PORT, () => console.log(`AI Video Animator running on port ${PORT}`));
