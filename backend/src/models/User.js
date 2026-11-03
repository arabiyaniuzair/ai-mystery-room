import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isUsingMemoryStore } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists for persistent storage
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    hasSeenWelcome: {
      type: Boolean,
      default: false,
    },
    lastLogoutAt: {
      type: Date,
      default: null,
    },
    stats: {
      lifetimeScore: { type: Number, default: 0 },
      highestSessionScore: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      casesPlayed: { type: Number, default: 0 },
      casesSolved: { type: Number, default: 0 },
      rank: { type: String, default: 'Rookie Detective' },
    },
    currentSession: {
      sessionId: { type: String, default: () => 'sess_' + Date.now() },
      sessionNumber: { type: Number, default: 1 },
      pointsEarned: { type: Number, default: 0 },
      loginAt: { type: Date, default: Date.now },
    },
    sessionHistory: [
      {
        sessionNumber: { type: Number, required: true },
        pointsEarned: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
        highestSessionScore: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export const computeRank = (score = 0) => {
  if (score >= 1000) return 'Chief Inspector';
  if (score >= 600) return 'Master Sleuth';
  if (score >= 300) return 'Senior Detective';
  if (score >= 100) return 'Junior Investigator';
  return 'Rookie Detective';
};

userSchema.methods.calculateRank = function () {
  const score = this.stats.lifetimeScore ?? this.stats.score ?? 0;
  return computeRank(score);
};

const MongooseUserModel = mongoose.model('User', userSchema);

const readUsersFromFile = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[UserStore] Read error:', err.message);
  }
  return [];
};

const writeUsersToFile = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[UserStore] Write error:', err.message);
  }
};

export const generateUniqueUsername = async (firstName) => {
  const cleaned = (firstName || 'Sleuth').replace(/[^a-zA-Z0-9]/g, '');
  const prefix = cleaned.length > 0 
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() 
    : 'Detective';

  let candidate = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    attempts++;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${prefix}_${randomSuffix}`;
    const exists = await User.findOne({ username: candidate });
    if (!exists) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    candidate = `${prefix}_${Date.now().toString().slice(-4)}`;
  }
  return candidate;
};

export const User = {
  async findOne(query) {
    if (!isUsingMemoryStore()) {
      return MongooseUserModel.findOne(query);
    }
    const users = readUsersFromFile();
    const matchCondition = (cond, u) => {
      if (cond.email && u.email && u.email.toLowerCase() === cond.email.toLowerCase()) return true;
      if (cond.username) {
        if (cond.username instanceof RegExp) {
          return cond.username.test(u.username);
        }
        return u.username && u.username.toLowerCase() === cond.username.toLowerCase();
      }
      if (cond._id && u._id && u._id.toString() === cond._id.toString()) return true;
      return false;
    };

    const found = users.find((u) => {
      if (Array.isArray(query.$or)) {
        return query.$or.some((cond) => matchCondition(cond, u));
      }
      return matchCondition(query, u);
    });

    if (!found) return null;

    return {
      ...found,
      calculateRank: function () {
        return computeRank(this.stats.lifetimeScore ?? this.stats.score ?? 0);
      },
      save: async function () {
        const allUsers = readUsersFromFile();
        const idx = allUsers.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          allUsers[idx] = { ...this, updatedAt: new Date() };
          writeUsersToFile(allUsers);
        }
        return this;
      },
    };
  },

  async findById(id) {
    if (!isUsingMemoryStore()) {
      return MongooseUserModel.findById(id);
    }
    return this.findOne({ _id: id });
  },

  async create(data) {
    if (!isUsingMemoryStore()) {
      return MongooseUserModel.create(data);
    }
    const users = readUsersFromFile();
    const newUser = {
      _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      firstName: data.firstName,
      username: data.username,
      email: data.email.toLowerCase(),
      password: data.password,
      hasSeenWelcome: data.hasSeenWelcome || false,
      lastLogoutAt: null,
      stats: {
        lifetimeScore: 0,
        highestSessionScore: 0,
        score: 0,
        casesPlayed: 0,
        casesSolved: 0,
        rank: 'Rookie Detective',
        ...(data.stats || {}),
      },
      currentSession: {
        sessionId: 'sess_' + Date.now(),
        sessionNumber: 1,
        pointsEarned: 0,
        loginAt: new Date(),
        ...(data.currentSession || {}),
      },
      sessionHistory: data.sessionHistory || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(newUser);
    writeUsersToFile(users);

    return {
      ...newUser,
      calculateRank: function () {
        return computeRank(this.stats.lifetimeScore ?? this.stats.score ?? 0);
      },
      save: async function () {
        const allUsers = readUsersFromFile();
        const idx = allUsers.findIndex((x) => x._id.toString() === this._id.toString());
        if (idx !== -1) {
          allUsers[idx] = { ...this, updatedAt: new Date() };
          writeUsersToFile(allUsers);
        }
        return this;
      },
    };
  },
};
