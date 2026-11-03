import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, generateUniqueUsername, computeRank } from '../models/User.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, username: user.username },
    process.env.JWT_SECRET || 'super_secret_noir_detective_key_2026',
    { expiresIn: '7d' }
  );
};

// Pending session terminations for tab close (with grace period for tab reloads)
const pendingTerminations = new Map();

export const cancelPendingSessionTermination = (userId) => {
  const uid = userId?.toString();
  if (uid && pendingTerminations.has(uid)) {
    clearTimeout(pendingTerminations.get(uid));
    pendingTerminations.delete(uid);
  }
};

export const register = async (req, res) => {
  try {
    const { firstName, email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!firstName || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        message: 'All fields (First Name, Email, Password, Confirm Password) are required.' 
      });
    }

    // Passwords match validation
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Password and confirm password do not match.' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    // Check existing email
    const existingEmail = await User.findOne({ email: email.trim() });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'An investigator with this email already exists.' 
      });
    }

    // Automatically generate a guaranteed unique username
    const generatedUsername = await generateUniqueUsername(firstName.trim());

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Initial session #1
    const initialSession = {
      sessionId: 'sess_' + Date.now(),
      sessionNumber: 1,
      pointsEarned: 0,
      loginAt: new Date(),
    };

    const user = await User.create({
      firstName: firstName.trim(),
      username: generatedUsername,
      email: email.trim().toLowerCase(),
      password: passwordHash,
      stats: {
        lifetimeScore: 0,
        highestSessionScore: 0,
        score: 0,
        casesPlayed: 0,
        casesSolved: 0,
        rank: 'Rookie Detective',
      },
      currentSession: initialSession,
      sessionHistory: [],
      hasSeenWelcome: false,
      lastLogoutAt: null,
    });

    cancelPendingSessionTermination(user._id);
    const token = generateToken(user);
    res.cookie('detective_session', token, { httpOnly: true, sameSite: 'lax' });

    return res.status(201).json({
      message: 'Investigator credentials created successfully.',
      username: generatedUsername,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        username: user.username,
        email: user.email,
        hasSeenWelcome: false,
        stats: user.stats,
        currentSession: user.currentSession,
        sessionHistory: user.sessionHistory || [],
      },
    });
  } catch (err) {
    console.error('[AuthController] Register error:', err);
    return res.status(500).json({ message: 'Failed to register investigator account.' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, email, identifier: rawIdentifier, password } = req.body;

    // Allow identifier via username, email, or dedicated identifier field
    const identifier = (username || email || rawIdentifier || '').trim();
    const trimmedPassword = (password || '').trim();

    // Check if both are empty/missing
    if (!identifier && !trimmedPassword) {
      return res.status(400).json({ message: 'Please enter valid login details.' });
    }

    // Check if username/email is missing
    if (!identifier) {
      return res.status(400).json({ message: 'Please enter a valid username or email address.' });
    }

    // Check if password is missing
    if (!trimmedPassword) {
      return res.status(400).json({ message: 'Please enter a valid password.' });
    }

    // Escape regex special characters to prevent regex injection
    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isEmail = identifier.includes('@');

    // Lookup user by email OR username (case-insensitive)
    const user = await User.findOne(
      isEmail
        ? { email: identifier.toLowerCase() }
        : {
            $or: [
              { username: new RegExp(`^${escapedIdentifier}$`, 'i') },
              { email: identifier.toLowerCase() },
            ],
          }
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }

    // RESET SESSION POINTS TO ZERO AT EVERY NEW LOGIN!
    // Archive previous session if it exists and had points or activity
    user.sessionHistory = user.sessionHistory || [];
    if (user.currentSession && user.currentSession.sessionNumber) {
      user.sessionHistory.push({
        sessionNumber: user.currentSession.sessionNumber,
        pointsEarned: user.currentSession.pointsEarned || 0,
        date: user.currentSession.loginAt || new Date(),
        highestSessionScore: user.stats?.highestSessionScore || 0,
      });
    }

    const nextSessionNumber = (user.sessionHistory.length) + 1;

    user.currentSession = {
      sessionId: 'sess_' + Date.now(),
      sessionNumber: nextSessionNumber,
      pointsEarned: 0, // Reset to zero at new login!
      loginAt: new Date(),
    };

    // Reset logout timestamp so active session is fully valid
    user.lastLogoutAt = null;
    cancelPendingSessionTermination(user._id);

    // Keep stats in sync
    user.stats = user.stats || {};
    user.stats.lifetimeScore = user.stats.lifetimeScore ?? user.stats.score ?? 0;
    user.stats.score = user.stats.lifetimeScore;
    user.stats.highestSessionScore = user.stats.highestSessionScore ?? 0;
    user.stats.rank = typeof user.calculateRank === 'function' ? user.calculateRank() : computeRank(user.stats.lifetimeScore);

    await user.save();

    const token = generateToken(user);
    res.cookie('detective_session', token, { httpOnly: true, sameSite: 'lax' });

    return res.json({
      message: 'Access granted, Detective.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        username: user.username,
        email: user.email,
        hasSeenWelcome: user.hasSeenWelcome || false,
        stats: user.stats,
        currentSession: user.currentSession,
        sessionHistory: user.sessionHistory,
      },
    });
  } catch (err) {
    console.error('[AuthController] Login error:', err);
    return res.status(500).json({ message: 'Authentication process encountered an error.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    // Refresh rank & stats
    user.stats = user.stats || {};
    user.stats.lifetimeScore = user.stats.lifetimeScore ?? user.stats.score ?? 0;
    user.stats.score = user.stats.lifetimeScore;
    user.stats.highestSessionScore = user.stats.highestSessionScore ?? 0;
    user.stats.rank = typeof user.calculateRank === 'function' ? user.calculateRank() : computeRank(user.stats.lifetimeScore);

    return res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        username: user.username,
        email: user.email,
        hasSeenWelcome: user.hasSeenWelcome || false,
        stats: user.stats,
        currentSession: user.currentSession || { sessionNumber: 1, pointsEarned: 0, loginAt: new Date() },
        sessionHistory: user.sessionHistory || [],
      },
    });
  } catch (err) {
    console.error('[AuthController] getMe error:', err);
    return res.status(500).json({ message: 'Failed to load investigator profile.' });
  }
};

export const dismissWelcome = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    user.hasSeenWelcome = true;
    if (typeof user.save === 'function') {
      await user.save();
    }
    return res.json({ success: true, hasSeenWelcome: true });
  } catch (err) {
    console.error('[AuthController] dismissWelcome error:', err);
    return res.status(500).json({ message: 'Failed to update welcome status.' });
  }
};

export const logout = async (req, res) => {
  try {
    const user = req.user;
    if (user) {
      cancelPendingSessionTermination(user._id);
      user.lastLogoutAt = new Date();
      if (typeof user.save === 'function') {
        await user.save();
      }
    }
    res.clearCookie('detective_session');
    return res.json({ message: 'Signed out successfully. Session invalidated.' });
  } catch (err) {
    console.error('[AuthController] logout error:', err);
    return res.status(500).json({ message: 'Logout error.' });
  }
};

export const sessionBeacon = async (req, res) => {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(200).send('OK');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_noir_detective_key_2026');
      const userId = decoded.id?.toString();
      if (!userId) return res.status(200).send('OK');

      // Schedule session invalidation with 6s grace period (cancelled if tab reloaded)
      cancelPendingSessionTermination(userId);
      const timer = setTimeout(async () => {
        try {
          const user = await User.findById(userId);
          if (user) {
            user.lastLogoutAt = new Date();
            if (typeof user.save === 'function') {
              await user.save();
            }
          }
        } catch (e) {
          console.error('[SessionBeacon] Error invalidating session:', e);
        } finally {
          pendingTerminations.delete(userId);
        }
      }, 6000);

      pendingTerminations.set(userId, timer);
    } catch (tokenErr) {
      // Ignored
    }

    return res.status(200).send('OK');
  } catch (err) {
    return res.status(200).send('OK');
  }
};

export const getScoreHistory = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const currentSession = user.currentSession || { sessionNumber: 1, pointsEarned: 0, loginAt: new Date() };
    const history = [...(user.sessionHistory || [])];

    return res.json({
      currentSession,
      sessionHistory: history,
      lifetimeScore: user.stats?.lifetimeScore ?? user.stats?.score ?? 0,
      highestSessionScore: user.stats?.highestSessionScore ?? 0,
    });
  } catch (err) {
    console.error('[AuthController] getScoreHistory error:', err);
    return res.status(500).json({ message: 'Failed to retrieve score history.' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ 
        message: 'Current password, new password, and confirm password are required.' 
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ 
        message: 'New password and confirm password do not match.' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long.' 
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    if (typeof user.save === 'function') {
      await user.save();
    }

    return res.json({ 
      success: true, 
      message: 'Password updated successfully. Please use your new passcode on your next sign in.' 
    });
  } catch (err) {
    console.error('[AuthController] changePassword error:', err);
    return res.status(500).json({ message: 'Failed to update passcode.' });
  }
};
