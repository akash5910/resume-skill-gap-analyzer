
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Registration page
router.get("/register", (req, res) => {
  res.render("auth/register", { error: null });
});

// Login page
router.get("/login", (req, res) => {
  res.render("auth/login", {
    error: null,
    message: req.query.registered
      ? "Registration successful! Please log in."
      : null,
  });
});

// Register user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).render("auth/register", {
        error: "Please fill in every field.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).render("auth/register", {
        error: "Name must contain at least 2 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).render("auth/register", {
        error: "Password must be at least 8 characters long.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("auth/register", {
        error: "Passwords do not match.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).render("auth/register", {
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      skills: [],
    });

    res.redirect("/login?registered=1");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).render("auth/register", {
        error: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);
    res.status(500).render("auth/register", {
      error: "Something went wrong. Please try again.",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("auth/login", {
        error: "Invalid email or password.",
        message: null,
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("Session creation failed:", error.message);
        return res.status(500).send("Unable to start your session.");
      }

      req.session.userId = user._id.toString();

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save failed:", saveError.message);
          return res.status(500).send("Unable to save your session.");
        }

        res.redirect("/dashboard");
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).render("auth/login", {
      error: "Something went wrong. Please try again.",
      message: null,
    });
  }
});

// Update profile name
router.post("/profile/update", requireAuth, async (req, res) => {
  try {
    const name = (req.body.name || "").trim();

    if (name.length < 2 || name.length > 80) {
      return res.status(400).send(
        "Name must contain between 2 and 80 characters. Go back and try again."
      );
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: { name } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.redirect("/login");
    }

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Profile update error:", error.message);
    res.status(500).send("Unable to update your profile.");
  }
});

// Add a skill
router.post("/profile/skills/add", requireAuth, async (req, res) => {
  try {
    const skill = (req.body.skill || "").trim();

    if (!skill || skill.length > 50) {
      return res.status(400).send(
        "Enter a skill between 1 and 50 characters. Go back and try again."
      );
    }

    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect("/login");
    }

    const alreadyExists = user.skills.some(
      (existingSkill) =>
        existingSkill.toLowerCase() === skill.toLowerCase()
    );

    if (!alreadyExists) {
      user.skills.push(skill);
      await user.save();
    }

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Add skill error:", error.message);
    res.status(500).send("Unable to add the skill.");
  }
});

// Remove a skill
router.post("/profile/skills/remove", requireAuth, async (req, res) => {
  try {
    const skill = (req.body.skill || "").trim();

    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect("/login");
    }

    user.skills = user.skills.filter(
      (existingSkill) => existingSkill !== skill
    );

    await user.save();
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Remove skill error:", error.message);
    res.status(500).send("Unable to remove the skill.");
  }
});

module.exports = router;
