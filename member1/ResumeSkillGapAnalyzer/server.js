
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const authRoutes = require("./routes/auth");
const resumeRoutes = require("./routes/resumes");
const connectDB = require("./models/db");
const User = require("./models/User");
const Resume = require("./models/Resume");
const requireAuth = require("./middleware/requireAuth");

const app = express();
// The project uses PORT=5000 for the main API, so Member 1 keeps its own port.
const PORT = process.env.MEMBER1_PORT || 3000;
const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URI;
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin, requestHost) {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const originHost = new URL(origin).hostname;
    const apiHost = requestHost.replace(/^\[|\]$/g, "");
    return originHost === apiHost ||
      (["localhost", "127.0.0.1"].includes(originHost) && ["localhost", "127.0.0.1"].includes(apiHost));
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin, req.hostname)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
    return res.sendStatus(204);
  }
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "rsga.sid",
    secret: process.env.SESSION_SECRET || "local-development-session-key-change-this",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl,
      collectionName: "sessions",
      ttl: 86400,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/", authRoutes);
app.use("/resumes", resumeRoutes);

function publicUser(user) {
  return { _id: user._id.toString(), name: user.name, email: user.email, skills: user.skills || [] };
}

app.get("/api/auth/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Please log in." });
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ message: "Please log in again." });
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2 || name.length > 80 || !email || password.length < 8) {
      return res.status(400).json({ message: "Enter a name, email and password with at least 8 characters." });
    }
    if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), skills: [] });
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ message: "Account created, but could not start your session." });
      req.session.userId = user._id.toString();
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ message: "Account created, but could not save your session." });
        res.status(201).json({ user: publicUser(user) });
      });
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    console.error("API registration error:", error.message);
    res.status(500).json({ message: "Could not create your account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ message: "Could not start your session." });
      req.session.userId = user._id.toString();
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ message: "Could not save your session." });
        res.json({ user: publicUser(user) });
      });
    });
  } catch (error) {
    console.error("API login error:", error.message);
    res.status(500).json({ message: "Could not log in." });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ message: "Could not log out." });
    res.clearCookie("rsga.sid");
    res.json({ loggedOut: true });
  });
});

app.get("/api/profile", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: "Profile was not found." });
  res.json({ user: publicUser(user) });
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (name.length < 2 || name.length > 80) return res.status(400).json({ message: "Name must contain between 2 and 80 characters." });
  const user = await User.findByIdAndUpdate(req.session.userId, { $set: { name } }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: "Profile was not found." });
  res.json({ user: publicUser(user) });
});

app.post("/api/profile/skills", requireAuth, async (req, res) => {
  const skill = String(req.body.skill || "").trim();
  if (!skill || skill.length > 50) return res.status(400).json({ message: "Enter a skill between 1 and 50 characters." });
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: "Profile was not found." });
  if (!user.skills.some((saved) => saved.toLowerCase() === skill.toLowerCase())) {
    user.skills.push(skill);
    await user.save();
  }
  res.json({ skills: user.skills });
});

app.delete("/api/profile/skills/:skill", requireAuth, async (req, res) => {
  const skill = req.params.skill;
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: "Profile was not found." });
  user.skills = user.skills.filter((saved) => saved.toLowerCase() !== skill.toLowerCase());
  await user.save();
  const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await mongoose.connection.collection("Progress").deleteMany({
    userId: req.session.userId,
    skill: new RegExp(`^${escapedSkill}$`, "i")
  });
  res.json({ skills: user.skills });
});

app.get("/", (req, res) => {
  res.redirect("/register");
});

app.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return req.session.destroy(() => {
        res.clearCookie("rsga.sid");
        res.redirect("/login");
      });
    }

    const resumes = await Resume.find({
      user: user._id,
    }).sort({ createdAt: -1 });

    res.render("profile/dashboard", { user, resumes });
  } catch (error) {
    console.error("Dashboard error:", error.message);
    res.status(500).send("Unable to load dashboard.");
  }
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);
      return res.status(500).send("Unable to log out.");
    }

    res.clearCookie("rsga.sid");
    res.redirect("/login");
  });
});

async function startServer() {
  try {
    if (!mongoUrl) {
      throw new Error("MONGODB_URI or MONGO_URI must be set in the project .env file");
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
