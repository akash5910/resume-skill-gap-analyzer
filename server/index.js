import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Bookmark, JobRole, LearningResource, Progress, Skill } from './models.js';

const require = createRequire(import.meta.url);

dns.setServers(['8.8.8.8']);

const app = express();
const port = process.env.PORT || 5000;
const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skill_gap_analyzer';
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Member 2's routes use the same JobRole model and MongoDB connection.
app.use('/api/jobroles', require('../member2/member2/routes/jobRoles.js'));
app.use('/api/analyze', require('../member2/member2/routes/analyze.js'));

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@12345';
const adminSessions = new Map();

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Incorrect admin username or password.' });
  }
  const token = randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const expiresAt = adminSessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    if (token) adminSessions.delete(token);
    return res.status(403).json({ message: 'Admin access is required.' });
  }
  next();
}

function sendError(res, message, status = 400) {
  return res.status(status).json({ message });
}

// Public lists are used by the dashboard. Search and filters use query parameters.
app.get('/api/skills', async (req, res) => {
  try {
    const filter = req.query.q ? { name: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
    res.json(await Skill.find(filter).sort({ name: 1 }));
  } catch { sendError(res, 'Could not get skills.', 500); }
});

app.get('/api/roles', async (req, res) => {
  try {
    const filter = {};
    if (req.query.q) filter.name = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (req.query.domain) filter.domain = new RegExp(`^${String(req.query.domain).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (req.query.skill) filter['requiredSkills.name'] = new RegExp(`^${String(req.query.skill).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    res.json(await JobRole.find(filter).sort({ name: 1 }));
  } catch { sendError(res, 'Could not get job roles.', 500); }
});

app.get('/api/resources', async (req, res) => {
  try {
    const filter = {};
    if (req.query.skill) filter.skill = new RegExp(`^${String(req.query.skill).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (req.query.q) filter.title = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    res.json(await LearningResource.find(filter).sort({ skill: 1, title: 1 }));
  } catch { sendError(res, 'Could not get learning resources.', 500); }
});

// Admin CRUD for the shared Skills and JobRoles collections.
app.post('/api/admin/skills', requireAdmin, async (req, res) => {
  try { res.status(201).json(await Skill.create(req.body)); }
  catch { sendError(res, 'Could not add skill. Check its name.'); }
});
app.put('/api/admin/skills/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return sendError(res, 'Skill was not found.', 404);
    res.json(item);
  } catch { sendError(res, 'Could not update skill.'); }
});
app.delete('/api/admin/skills/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Skill.findByIdAndDelete(req.params.id);
    if (!item) return sendError(res, 'Skill was not found.', 404);
    res.json({ deleted: true });
  } catch { sendError(res, 'Could not delete skill.'); }
});

app.post('/api/admin/roles', requireAdmin, async (req, res) => {
  try { res.status(201).json(await JobRole.create(req.body)); }
  catch { sendError(res, 'Could not add job role. Add a unique name and at least one required skill.'); }
});
app.put('/api/admin/roles/:id', requireAdmin, async (req, res) => {
  try {
    const item = await JobRole.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return sendError(res, 'Job role was not found.', 404);
    res.json(item);
  } catch { sendError(res, 'Could not update job role.'); }
});
app.delete('/api/admin/roles/:id', requireAdmin, async (req, res) => {
  try {
    const item = await JobRole.findByIdAndDelete(req.params.id);
    if (!item) return sendError(res, 'Job role was not found.', 404);
    await Bookmark.deleteMany({ roleId: String(item._id) });
    res.json({ deleted: true });
  } catch { sendError(res, 'Could not delete job role.'); }
});

// Admin CRUD for learning resources.
app.post('/api/admin/resources', requireAdmin, async (req, res) => {
  try { res.status(201).json(await LearningResource.create(req.body)); }
  catch { sendError(res, 'Could not add resource. Add its skill, title and URL.'); }
});
app.put('/api/admin/resources/:id', requireAdmin, async (req, res) => {
  try {
    const item = await LearningResource.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return sendError(res, 'Resource was not found.', 404);
    res.json(item);
  } catch { sendError(res, 'Could not update resource.'); }
});
app.delete('/api/admin/resources/:id', requireAdmin, async (req, res) => {
  try {
    const item = await LearningResource.findByIdAndDelete(req.params.id);
    if (!item) return sendError(res, 'Resource was not found.', 404);
    res.json({ deleted: true });
  } catch { sendError(res, 'Could not delete resource.'); }
});

// Member 1 should pass the signed-in user's id in these requests when the modules are joined.
app.get('/api/progress/:userId', async (req, res) => {
  try { res.json(await Progress.find({ userId: req.params.userId }).sort({ skill: 1 })); }
  catch { sendError(res, 'Could not get progress.', 500); }
});
app.post('/api/progress', async (req, res) => {
  try {
    const { userId, skill, status } = req.body;
    if (!userId || !skill || !['Not Started', 'In Progress', 'Completed'].includes(status)) {
      return sendError(res, 'Add a user, skill and valid progress status.');
    }
    const percent = status === 'Completed' ? 100 : status === 'In Progress' ? 50 : 0;
    const item = await Progress.findOneAndUpdate(
      { userId, skill }, { userId, skill, status, percent, updatedAt: new Date() },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(item);
  } catch { sendError(res, 'Could not save progress.'); }
});
app.delete('/api/progress/:userId/:skill', async (req, res) => {
  try {
    const result = await Progress.deleteOne({ userId: req.params.userId, skill: req.params.skill });
    if (!result.deletedCount) return sendError(res, 'Progress was not found.', 404);
    res.json({ deleted: true });
  } catch { sendError(res, 'Could not remove progress.'); }
});

app.get('/api/bookmarks/:userId', async (req, res) => {
  try { res.json(await Bookmark.find({ userId: req.params.userId })); }
  catch { sendError(res, 'Could not get saved roles.', 500); }
});
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { userId, roleId, roleName } = req.body;
    if (!userId || !roleId || !roleName) return sendError(res, 'Add a user and job role.');
    const saved = await Bookmark.findOne({ userId, roleId });
    if (saved) {
      await saved.deleteOne();
      return res.json({ saved: false });
    }
    await Bookmark.create({ userId, roleId, roleName });
    res.json({ saved: true });
  } catch { sendError(res, 'Could not update saved roles.'); }
});

app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const [progress, bookmarks, resources, roles] = await Promise.all([
      Progress.find({ userId: req.params.userId }),
      Bookmark.find({ userId: req.params.userId }),
      LearningResource.countDocuments(),
      JobRole.countDocuments()
    ]);
    const activeProgress = progress.filter((item) => item.status !== 'Not Started');
    const completed = activeProgress.filter((item) => item.status === 'Completed').length;
    const savedRoles = await JobRole.find({ _id: { $in: bookmarks.map((item) => item.roleId) } });
    const progressBySkill = new Map(progress.map((item) => [item.skill.toLowerCase(), item.percent || 0]));
    const roleAverages = savedRoles
      .filter((role) => role.requiredSkills?.length)
      .map((role) => role.requiredSkills.reduce(
        (sum, skill) => sum + (progressBySkill.get(skill.name.toLowerCase()) || 0), 0
      ) / role.requiredSkills.length);
    const averageProgress = roleAverages.length
      ? Math.round(roleAverages.reduce((sum, value) => sum + value, 0) / roleAverages.length)
      : 0;
    res.json({ skillsTracked: activeProgress.length, completed, averageProgress, savedRoles: bookmarks.length, resources, roles, progress });
  } catch { sendError(res, 'Could not load dashboard.', 500); }
});

mongoose.connect(mongoUrl)
  .then(() => app.listen(port, () => console.log(`Server is running on port ${port}`)))
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
