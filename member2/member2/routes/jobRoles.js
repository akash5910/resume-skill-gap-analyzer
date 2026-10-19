const router = require("express").Router();
const JobRole = require("../models/JobRole");

// The shared admin page sends this key for changes to the job role collection.
router.use((req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey || req.headers["x-admin-key"] !== adminKey) {
      return res.status(403).json({ error: "Admin access is required" });
    }
  }
  next();
});

// CREATE
router.post("/", async (req, res) => {
  try {
    res.status(201).json(await JobRole.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// READ all (filter by domain, search by name, sort)
// e.g. /api/jobroles?domain=Data&search=an&sort=name
router.get("/", async (req, res) => {
  const { domain, search, sort = "name" } = req.query;
  const filter = {};
  if (domain) filter.domain = domain;
  if (search) filter.name = new RegExp(search, "i");
  res.json(await JobRole.find(filter).sort(sort));
});

// QUERY: roles requiring a particular skill  e.g. /api/jobroles/by-skill/SQL
router.get("/by-skill/:skill", async (req, res) => {
  const safe = req.params.skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const roles = await JobRole.find({
    "requiredSkills.name": new RegExp(`^${safe}$`, "i"),
  });
  res.json(roles);
});

// READ one
router.get("/:id", async (req, res) => {
  try {
    const role = await JobRole.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (e) {
    res.status(400).json({ error: "Invalid id" });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const role = await JobRole.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const role = await JobRole.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json({ message: "Role deleted" });
  } catch (e) {
    res.status(400).json({ error: "Invalid id" });
  }
});

module.exports = router;
