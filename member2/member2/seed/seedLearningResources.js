// Run from project root: node member2/member2/seed/seedLearningResources.js
require("dotenv").config();
require("dns").setServers(["8.8.8.8"]);
const mongoose = require("mongoose");
const resourceSchema = new mongoose.Schema({
  skill: { type: String, required: true }, title: { type: String, required: true },
  url: { type: String, required: true }, youtubeUrl: { type: String, default: "" },
  difficulty: { type: String, default: "Beginner" }
}, { collection: "LearningResources" });
const LearningResource = mongoose.model("SeedLearningResource", resourceSchema, "LearningResources");

// These are free tutorials or official documentation pages.
const guides = {
  "JavaScript": ["MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"],
  "HTML": ["MDN HTML basics", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content"],
  "CSS": ["MDN CSS basics", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics"],
  "React": ["React Learn", "https://react.dev/learn"],
  "Node.js": ["Node.js Learn", "https://nodejs.org/en/learn"],
  "Express": ["Express getting started", "https://expressjs.com/en/starter/installing.html"],
  "MongoDB": ["MongoDB University free courses", "https://learn.mongodb.com/"],
  "SQL": ["SQLBolt interactive lessons", "https://sqlbolt.com/"],
  "REST APIs": ["MDN HTTP overview", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview"],
  "Git": ["Pro Git book", "https://git-scm.com/book/en/v2"],
  "Docker": ["Docker getting started", "https://docs.docker.com/get-started/"],
  "JWT Authentication": ["JWT introduction", "https://jwt.io/introduction"],
  "Excel": ["Microsoft Excel help and learning", "https://support.microsoft.com/en-us/excel"],
  "Python": ["Python tutorial", "https://docs.python.org/3/tutorial/"],
  "Pandas": ["Pandas getting started tutorials", "https://pandas.pydata.org/docs/getting_started/intro_tutorials/"],
  "Statistics": ["Khan Academy statistics", "https://www.khanacademy.org/math/statistics-probability"],
  "Data Visualization": ["Tableau free training videos", "https://www.tableau.com/learn/training"],
  "Power BI": ["Microsoft Learn Power BI", "https://learn.microsoft.com/en-us/training/powerplatform/power-bi"],
  "Tableau": ["Tableau free training", "https://www.tableau.com/learn/training"],
  "Networking": ["Cisco Skills for All networking courses", "https://skillsforall.com/"],
  "Linux": ["Linux Journey", "https://linuxjourney.com/"],
  "Cryptography": ["CryptoHack free lessons", "https://cryptohack.org/"],
  "Penetration Testing": ["PortSwigger Web Security Academy", "https://portswigger.net/web-security"],
  "SIEM Tools": ["Splunk free training", "https://www.splunk.com/en_us/training/free-courses/overview.html"],
  "Incident Response": ["NIST incident response guide", "https://csrc.nist.gov/pubs/sp/800/61/r3/final"],
  "Risk Assessment": ["NIST risk management framework", "https://www.nist.gov/cyberframework"],
  "Responsive Design": ["MDN responsive design", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design"],
  "Shell Scripting": ["Bash beginner guide", "https://guide.bash.academy/"],
  "CI/CD": ["GitHub Actions documentation", "https://docs.github.com/en/actions"],
  "Kubernetes": ["Kubernetes tutorials", "https://kubernetes.io/docs/tutorials/"],
  "AWS": ["AWS Skill Builder free training", "https://skillbuilder.aws/"],
  "Terraform": ["HashiCorp Terraform tutorials", "https://developer.hashicorp.com/terraform/tutorials"],
  "IAM": ["AWS IAM getting started", "https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-started.html"],
  "Cloud Security": ["AWS security learning", "https://docs.aws.amazon.com/whitepapers/latest/introduction-aws-security/introduction-aws-security.html"],
  "Linear Algebra": ["Khan Academy linear algebra", "https://www.khanacademy.org/math/linear-algebra"],
  "NumPy": ["NumPy learn", "https://numpy.org/learn/"],
  "Machine Learning": ["Google Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course"],
  "scikit-learn": ["scikit-learn tutorials", "https://scikit-learn.org/stable/tutorial/index.html"],
  "Testing Fundamentals": ["Ministry of Testing free resources", "https://www.ministryoftesting.com/dojo"],
  "Playwright": ["Playwright getting started", "https://playwright.dev/docs/intro"],
  "API Testing": ["Postman learning center", "https://learning.postman.com/"],
  "Kotlin": ["Kotlin getting started", "https://kotlinlang.org/docs/getting-started.html"],
  "Android Development": ["Android Kotlin beginner course", "https://developer.android.com/courses/android-basics-kotlin/course"],
  "UI Design": ["Material Design foundations", "https://m3.material.io/foundations"],
  "SQLite": ["SQLite documentation", "https://www.sqlite.org/docs.html"],
  "Figma": ["Figma learning resources", "https://help.figma.com/hc/en-us/categories/360002042553-Learn-design"],
  "User Research": ["Interaction Design Foundation user research basics", "https://www.interaction-design.org/literature/topics/user-research"],
  "Wireframing": ["Figma wireframe guide", "https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-wireframing"],
  "Prototyping": ["Figma prototyping guide", "https://help.figma.com/hc/en-us/categories/360002051613-Prototyping"],
  "Accessibility": ["W3C accessibility tutorials", "https://www.w3.org/WAI/tutorials/"],
  "Usability Testing": ["Usability.gov testing resources", "https://www.usability.gov/how-to-and-tools/methods/usability-testing.html"],
  "PostgreSQL": ["PostgreSQL tutorial", "https://www.postgresql.org/docs/current/tutorial.html"],
  "Database Design": ["MongoDB data modeling guide", "https://www.mongodb.com/docs/manual/data-modeling/"],
  "Indexing": ["MongoDB indexes guide", "https://www.mongodb.com/docs/manual/indexes/"],
  "Backup and Recovery": ["PostgreSQL backup and restore", "https://www.postgresql.org/docs/current/backup.html"],
  "Database Security": ["MongoDB security checklist", "https://www.mongodb.com/docs/manual/administration/security-checklist/"],
  "Java": ["Dev.java learning tutorials", "https://dev.java/learn/"],
  "Data Structures and Algorithms": ["OpenDSA free textbook", "https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/"],
  "Object-Oriented Programming": ["Oracle Java object-oriented concepts", "https://docs.oracle.com/javase/tutorial/java/concepts/"],
  "Unit Testing": ["Jest getting started", "https://jestjs.io/docs/getting-started"],
  "TCP/IP": ["Cisco networking basics", "https://skillsforall.com/"],
  "Routing and Switching": ["Cisco networking courses", "https://skillsforall.com/"],
  "Wireshark": ["Wireshark user guide", "https://www.wireshark.org/docs/"],
  "Network Security": ["Cisco cybersecurity courses", "https://skillsforall.com/"],
  "Cloud Networking": ["AWS networking basics", "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/networking-services.html"],
};

const allSkills = [
  "JavaScript", "Node.js", "Express", "MongoDB", "SQL", "REST APIs", "Git", "Docker", "JWT Authentication", "Excel", "Python", "Pandas", "Statistics", "Data Visualization", "Power BI", "Tableau", "Networking", "Linux", "Cryptography", "Penetration Testing", "SIEM Tools", "Incident Response", "Risk Assessment", "HTML", "CSS", "React", "Responsive Design", "Shell Scripting", "CI/CD", "Kubernetes", "AWS", "Terraform", "IAM", "Cloud Security", "Linear Algebra", "NumPy", "Machine Learning", "scikit-learn", "Testing Fundamentals", "Playwright", "API Testing", "Kotlin", "Android Development", "UI Design", "SQLite", "Figma", "User Research", "Wireframing", "Prototyping", "Accessibility", "Usability Testing", "PostgreSQL", "Database Design", "Indexing", "Backup and Recovery", "Database Security", "Java", "Data Structures and Algorithms", "Object-Oriented Programming", "Unit Testing", "TCP/IP", "Routing and Switching", "Wireshark", "Network Security", "Cloud Networking"
];

(async () => {
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUrl) throw new Error("Set MONGODB_URI or MONGO_URI in the project .env file");
  await mongoose.connect(mongoUrl);
  const operations = allSkills.map((skill) => {
    const [title, url] = guides[skill];
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} beginner tutorial`)}`;
    return {
      updateOne: {
        filter: { skill },
        update: { $setOnInsert: { skill, title, url, difficulty: "Beginner" }, $set: { youtubeUrl } },
        upsert: true
      }
    };
  });
  await LearningResource.bulkWrite(operations, { ordered: false });
  console.log(`Added free guides and YouTube topic links for ${allSkills.length} skills.`);
  await mongoose.disconnect();
})().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });
