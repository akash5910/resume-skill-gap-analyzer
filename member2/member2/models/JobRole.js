const mongoose = require("mongoose");

const requiredSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    importance: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    learningTimeWeeks: { type: Number, default: 2, min: 0 },
    prerequisites: [{ type: String, trim: true }],
  },
  { _id: false }
);

const jobRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    domain: { type: String, trim: true }, // e.g. "Software", "Data", "Security"
    description: { type: String, trim: true },
    requiredSkills: {
      type: [requiredSkillSchema],
      validate: (v) => v.length > 0,
    },
  },
  { timestamps: true }
);

// Indexes so "find roles requiring skill X" is fast (good DBMS demo point)
jobRoleSchema.index({ "requiredSkills.name": 1 });
jobRoleSchema.index({ domain: 1 });

// Keep the collection name aligned with the project database plan.
module.exports = mongoose.model("JobRole", jobRoleSchema, "JobRoles");
