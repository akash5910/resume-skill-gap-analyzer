
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const Resume = require("../models/Resume");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads", "resumes");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype !== "application/pdf" ||
      path.extname(file.originalname).toLowerCase() !== ".pdf"
    ) {
      return cb(new Error("Only PDF files are allowed."));
    }

    cb(null, true);
  },
});

// Resume list for the React dashboard.
router.get("/list", requireAuth, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.session.userId }).sort({ createdAt: -1 });
    res.json(resumes.map((resume) => ({
      _id: resume._id.toString(), originalName: resume.originalName,
      size: resume.size, createdAt: resume.createdAt
    })));
  } catch (error) {
    console.error("Resume list error:", error.message);
    res.status(500).json({ message: "Unable to get your resumes." });
  }
});

// Upload a resume
router.post(
  "/upload",
  requireAuth,
  upload.single("resume"),
  async (req, res) => {
    let savedFile = null;

    try {
      if (!req.file) {
        return res.status(400).send("Please select a PDF resume.");
      }

      savedFile = req.file.path;

      // Verify the file actually starts with a PDF signature.
      const fileHandle = await fs.promises.open(savedFile, "r");
      const header = Buffer.alloc(5);

      try {
        await fileHandle.read(header, 0, 5, 0);
      } finally {
        await fileHandle.close();
      }

      if (header.toString("ascii") !== "%PDF-") {
        await fs.promises.unlink(savedFile);
        savedFile = null;
        return res.status(400).send("The selected file is not a valid PDF.");
      }

      const resume = await Resume.create({
        user: req.session.userId,
        originalName: path.basename(req.file.originalname),
        storedName: req.file.filename,
        mimeType: "application/pdf",
        size: req.file.size,
      });

      savedFile = null;
      if (req.accepts("json")) return res.status(201).json({
        _id: resume._id.toString(), originalName: resume.originalName,
        size: resume.size, createdAt: resume.createdAt
      });
      res.redirect("/dashboard");
    } catch (error) {
      if (savedFile) {
        await fs.promises.unlink(savedFile).catch(() => {});
      }

      console.error("Resume upload error:", error.message);
      res.status(500).send("Unable to upload the resume.");
    }
  }
);

// View a resume belonging to the logged-in user
router.get("/:id/view", requireAuth, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).send("Resume not found.");
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!resume) {
      return res.status(404).send("Resume not found.");
    }

    const filePath = path.join(uploadDir, resume.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Resume file not found.");
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="resume-${resume._id}.pdf"`
    );

    res.sendFile(filePath);
  } catch (error) {
    console.error("Resume view error:", error.message);
    res.status(500).send("Unable to open the resume.");
  }
});

// Delete a resume belonging to the logged-in user
router.post("/:id/delete", requireAuth, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).send("Resume not found.");
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!resume) {
      return res.status(404).send("Resume not found.");
    }

    await Resume.deleteOne({ _id: resume._id });

    const filePath = path.join(uploadDir, resume.storedName);
    await fs.promises.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error("Resume file deletion error:", error.message);
      }
    });

    if (req.accepts("json")) return res.json({ deleted: true });
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Resume deletion error:", error.message);
    res.status(500).send("Unable to delete the resume.");
  }
});

// Display upload validation errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      if (req.accepts("json")) return res.status(400).json({ message: "Resume must be 5 MB or smaller." });
      return res.status(400).send("Resume must be 5 MB or smaller.");
    }

    if (req.accepts("json")) return res.status(400).json({ message: "Unable to upload the selected file." });
    return res.status(400).send("Unable to upload the selected file.");
  }

  if (error) {
    if (req.accepts("json")) return res.status(400).json({ message: error.message || "Upload failed." });
    return res.status(400).send(error.message || "Upload failed.");
  }

  next();
});

module.exports = router;
