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

    // Wan 2.7 edit-video accepts 2–10 second source clips, up to 100 MB.
    // duration: "0" tells the model to match the source clip's duration.
    const prompt = [
      "Restyle the entire input video as a high-quality, polished 3D animated film.",
      "Render subjects and environments as dimensional 3D computer-generated animation,",
      "with coherent geometry, detailed materials, natural lighting, cinematic shading,",
      "and smooth, temporally consistent motion.",
      "Preserve the original scenes, subjects, objects, actions, gestures, timing, shot order,",
      "composition, framing, camera movements, camera angles and transitions as closely as possible.",
      "Keep the same number of subjects and objects. Do not invent new scenes or change the story.",
      "Maintain consistent character appearance and environment details across every frame.",
      "Avoid flicker, shape warping, unwanted text, abrupt cuts and unintended camera changes."
    ].join(" ");

    const videoFile = new File([req.file.buffer], req.file.originalname || "reference.mp4", { type: req.file.mimetype });
    const videoUrl = await fal.storage.upload(videoFile);
    const result = await fal.subscribe(MODEL, {
      input: {
        prompt,
        video_url: videoUrl,
        resolution: "1080p",
        duration: "0",
        audio_setting: "origin",
        enable_safety_checker: true
      },
      logs: true
    });

    const output = result?.data?.video;
    if (!output?.url) return res.status(502).json({ error: "AI service did not return a finished video. Please try again." });
    res.json({
      ok: true,
      videoUrl: output.url,
      fileName: output.file_name || "3d-animated-video.mp4",
      duration: output.duration,
      width: output.width,
      height: output.height
    });
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
