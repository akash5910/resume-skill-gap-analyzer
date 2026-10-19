import mongoose from 'mongoose';
import { createRequire } from 'node:module';

// Reuse Member 2's model so both parts use the same schema and MongoDB collection.
const require = createRequire(import.meta.url);
const JobRole = require('../member2/member2/models/JobRole.js');

// These two collections are shared with Member 2. Keep the fields in step with their module.
const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, default: 'General' },
  description: { type: String, default: '' }
});

const learningResourceSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  youtubeUrl: { type: String, default: '' },
  difficulty: { type: String, default: 'Beginner' }
});

const progressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  skill: { type: String, required: true },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  percent: { type: Number, default: 0, min: 0, max: 100 },
  updatedAt: { type: Date, default: Date.now }
});
progressSchema.index({ userId: 1, skill: 1 }, { unique: true });

const bookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String, required: true }
});
bookmarkSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export const Skill = mongoose.model('Skills', skillSchema, 'Skills');
export { JobRole };
export const LearningResource = mongoose.model('LearningResources', learningResourceSchema, 'LearningResources');
export const Progress = mongoose.model('Progress', progressSchema, 'Progress');
export const Bookmark = mongoose.model('Bookmarks', bookmarkSchema, 'Bookmarks');
