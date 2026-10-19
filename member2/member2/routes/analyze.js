const router = require("express").Router();
const JobRole = require("../models/JobRole");
const { analyzeSkills } = require("../utils/skillGap");

// POST /api/analyze   body: { roleId, userSkills: ["Java","SQL"] }
router.post("/", async (req, res) => {
  try {
    const { roleId, userSkills } = req.body;
    if (!roleId || !Array.isArray(userSkills))
      return res.status(400).json({ error: "roleId and userSkills[] are required" });

    const role = await JobRole.findById(roleId);
    if (!role) return res.status(404).json({ error: "Role not found" });

    res.json(analyzeSkills(userSkills, role));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/analyze/all  -> rank every role for the user's skills
router.post("/all", async (req, res) => {
  try {
    const { userSkills } = req.body;
    if (!Array.isArray(userSkills))
      return res.status(400).json({ error: "userSkills[] is required" });
    const roles = await JobRole.find();
    const results = roles
      .map((r) => analyzeSkills(userSkills, r))
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
