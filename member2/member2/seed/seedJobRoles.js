// Run from the project root: node member2/member2/seed/seedJobRoles.js
require("dotenv").config();
require("dns").setServers(["8.8.8.8"]);
const mongoose = require("mongoose");
const JobRole = require("../models/JobRole");

const s = (name, importance, learningTimeWeeks, prerequisites = []) => ({
  name, importance, learningTimeWeeks, prerequisites,
});

const roles = [
  {
    name: "Backend Developer", domain: "Software",
    description: "Builds server-side logic, APIs and databases.",
    requiredSkills: [
      s("JavaScript", "High", 4), s("Node.js", "High", 3, ["JavaScript"]),
      s("Express", "High", 2, ["Node.js"]), s("MongoDB", "High", 3),
      s("SQL", "Medium", 3), s("REST APIs", "High", 2), s("Git", "Medium", 1),
      s("Docker", "Low", 2), s("JWT Authentication", "Medium", 2, ["Express"]),
    ],
  },
  {
    name: "Data Analyst", domain: "Data",
    description: "Turns data into insights and reports.",
    requiredSkills: [
      s("SQL", "High", 3), s("Excel", "High", 2), s("Python", "High", 4),
      s("Pandas", "Medium", 2, ["Python"]), s("Statistics", "High", 4),
      s("Data Visualization", "Medium", 2), s("Power BI", "Low", 2), s("Tableau", "Low", 2),
    ],
  },
  {
    name: "Cybersecurity Analyst", domain: "Security",
    description: "Protects systems and detects threats.",
    requiredSkills: [
      s("Networking", "High", 4), s("Linux", "High", 3), s("Cryptography", "Medium", 3),
      s("Penetration Testing", "Medium", 5, ["Networking", "Linux"]),
      s("SIEM Tools", "Medium", 3), s("Python", "Low", 3),
      s("Incident Response", "High", 3), s("Risk Assessment", "Low", 2),
    ],
  },
  {
    name: "Frontend Developer", domain: "Software",
    description: "Builds user interfaces for the web.",
    requiredSkills: [
      s("HTML", "High", 1), s("CSS", "High", 2), s("JavaScript", "High", 4),
      s("React", "High", 4, ["JavaScript"]), s("Git", "Medium", 1),
      s("Responsive Design", "Medium", 1), s("REST APIs", "Medium", 2),
    ],
  },
  { name: "Full Stack Developer", domain: "Software", description: "Builds both the website interface and its server.", requiredSkills: [s("HTML", "High", 1), s("CSS", "High", 2), s("JavaScript", "High", 4), s("React", "High", 4, ["JavaScript"]), s("Node.js", "High", 3, ["JavaScript"]), s("Express", "Medium", 2, ["Node.js"]), s("MongoDB", "Medium", 3), s("Git", "Medium", 1)] },
  { name: "DevOps Engineer", domain: "Cloud", description: "Automates software delivery and manages deployment systems.", requiredSkills: [s("Linux", "High", 3), s("Git", "High", 1), s("Shell Scripting", "Medium", 3), s("Docker", "High", 2), s("CI/CD", "High", 3, ["Git"]), s("Kubernetes", "Medium", 5, ["Docker"]), s("AWS", "Medium", 4), s("Terraform", "Low", 3)] },
  { name: "Cloud Engineer", domain: "Cloud", description: "Builds and maintains services hosted in the cloud.", requiredSkills: [s("Linux", "High", 3), s("Networking", "High", 4), s("AWS", "High", 4), s("Docker", "Medium", 2), s("Terraform", "Medium", 3), s("IAM", "Medium", 2), s("Cloud Security", "Medium", 3), s("Python", "Low", 4)] },
  { name: "Machine Learning Engineer", domain: "Data", description: "Builds software that trains and uses machine learning models.", requiredSkills: [s("Python", "High", 4), s("Statistics", "High", 4), s("Linear Algebra", "Medium", 4), s("NumPy", "Medium", 2, ["Python"]), s("Pandas", "Medium", 2, ["Python"]), s("Machine Learning", "High", 6, ["Statistics", "Python"]), s("scikit-learn", "Medium", 3, ["Machine Learning"]), s("Git", "Low", 1)] },
  { name: "QA Automation Engineer", domain: "Software", description: "Checks software quality using manual and automated tests.", requiredSkills: [s("Testing Fundamentals", "High", 2), s("JavaScript", "High", 4), s("Playwright", "High", 3, ["JavaScript"]), s("API Testing", "Medium", 2), s("SQL", "Medium", 3), s("Git", "Medium", 1), s("CI/CD", "Low", 3)] },
  { name: "Android Developer", domain: "Mobile", description: "Creates applications for Android phones and tablets.", requiredSkills: [s("Kotlin", "High", 5), s("Android Development", "High", 6, ["Kotlin"]), s("UI Design", "Medium", 2), s("REST APIs", "Medium", 2), s("SQLite", "Medium", 2), s("Git", "Low", 1)] },
  { name: "UI/UX Designer", domain: "Design", description: "Plans and designs clear, usable digital products.", requiredSkills: [s("UI Design", "High", 4), s("Figma", "High", 3), s("User Research", "High", 3), s("Wireframing", "Medium", 2), s("Prototyping", "Medium", 2), s("Accessibility", "Medium", 2), s("Usability Testing", "Medium", 2)] },
  { name: "Database Administrator", domain: "Data", description: "Maintains databases, performance, security and backups.", requiredSkills: [s("SQL", "High", 3), s("PostgreSQL", "High", 3), s("Database Design", "High", 3), s("Indexing", "Medium", 2), s("Backup and Recovery", "Medium", 2), s("Linux", "Medium", 3), s("Database Security", "Medium", 2)] },
  { name: "Software Engineer", domain: "Software", description: "Designs, builds and maintains software applications.", requiredSkills: [s("Java", "High", 5), s("Data Structures and Algorithms", "High", 6), s("Object-Oriented Programming", "High", 3, ["Java"]), s("Git", "Medium", 1), s("SQL", "Medium", 3), s("Unit Testing", "Medium", 2), s("REST APIs", "Low", 2)] },
  { name: "Network Engineer", domain: "Networking", description: "Sets up and troubleshoots computer networks.", requiredSkills: [s("Networking", "High", 4), s("TCP/IP", "High", 3), s("Routing and Switching", "High", 4), s("Linux", "Medium", 3), s("Wireshark", "Medium", 2), s("Network Security", "Medium", 3), s("Cloud Networking", "Low", 3)] },
];

(async () => {
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUrl) throw new Error('Set MONGODB_URI or MONGO_URI in the project .env file');
  await mongoose.connect(mongoUrl);
  await JobRole.bulkWrite(roles.map((role) => ({
    updateOne: {
      filter: { name: role.name },
      update: { $setOnInsert: role },
      upsert: true,
    },
  })));
  console.log(`Added any missing sample roles without replacing existing roles`);
  await mongoose.disconnect();
})();
