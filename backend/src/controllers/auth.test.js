import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login, changePassword, getMe } from './authController.js';
import { User } from '../models/User.js';

console.log('--- Starting User Authentication & Account Management Tests ---');

// Mock Express req/res helper
const createMockReqRes = (body = {}, headers = {}, user = null) => {
  const req = {
    body,
    headers: { ...headers },
    user,
  };
  let responseStatus = 200;
  let responseData = null;
  let responseCookie = null;

  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    cookie(name, val, opts) {
      responseCookie = { name, val, opts };
      return this;
    },
    getStatus: () => responseStatus,
    getData: () => responseData,
    getCookie: () => responseCookie,
  };

  return { req, res };
};

const testEmail = `detective_${Date.now()}@scotlandyard.org`;
const testPassword = 'SecretPasscode123!';
let generatedUsername = '';
let authToken = '';

// Test 1: User Registration Input Validation
{
  // Missing fields
  const { req, res } = createMockReqRes({ firstName: 'Sherlock' });
  await register(req, res);
  assert.equal(res.getStatus(), 400, 'Should reject incomplete registration');

  // Password mismatch
  const { req: mismatchReq, res: mismatchRes } = createMockReqRes({
    firstName: 'Sherlock',
    email: 'mismatch@example.com',
    password: 'password123',
    confirmPassword: 'differentpassword',
  });
  await register(mismatchReq, mismatchRes);
  assert.equal(mismatchRes.getStatus(), 400, 'Should reject mismatched passwords');
  assert.match(mismatchRes.getData().message, /do not match/i);

  // Short password
  const { req: shortReq, res: shortRes } = createMockReqRes({
    firstName: 'Sherlock',
    email: 'short@example.com',
    password: '123',
    confirmPassword: '123',
  });
  await register(shortReq, shortRes);
  assert.equal(shortRes.getStatus(), 400, 'Should reject short passwords');

  console.log('✓ Test 1 Passed: Registration input validation (required fields, mismatch, min length) verified.');
}

// Test 2: Successful Registration, Secure Password Hashing & Unique Username Generation
{
  const { req, res } = createMockReqRes({
    firstName: 'Sherlock',
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword,
  });

  await register(req, res);
  assert.equal(res.getStatus(), 201, 'Should return 201 Created on valid registration');
  const data = res.getData();
  assert.ok(data.username, 'Must generate unique username');
  assert.ok(data.token, 'Must return session JWT token');
  assert.equal(data.user.email, testEmail.toLowerCase());

  generatedUsername = data.username;
  authToken = data.token;

  // Verify password in DB is hashed and NEVER plain text
  const userRecord = await User.findOne({ email: testEmail });
  assert.ok(userRecord, 'User must exist in store');
  assert.notEqual(userRecord.password, testPassword, 'Password must NEVER be stored in plain text');
  assert.ok(await bcrypt.compare(testPassword, userRecord.password), 'Password hash must match bcrypt');

  console.log(`✓ Test 2 Passed: Registration succeeded with unique username (${generatedUsername}) and bcrypt hashed password.`);
}

// Test 3: Prevent Duplicate Account Registrations
{
  const { req, res } = createMockReqRes({
    firstName: 'Sherlock Dup',
    email: testEmail, // same email
    password: 'AnotherPassword123!',
    confirmPassword: 'AnotherPassword123!',
  });

  await register(req, res);
  assert.equal(res.getStatus(), 400, 'Should reject duplicate email registration');
  assert.match(res.getData().message, /already exists/i);
  console.log('✓ Test 3 Passed: Duplicate email registration correctly prevented.');
}

// Test 4: User Login using Username
{
  const { req, res } = createMockReqRes({
    username: generatedUsername,
    password: testPassword,
  });

  await login(req, res);
  assert.equal(res.getStatus(), 200, 'Should allow login with username');
  const data = res.getData();
  assert.ok(data.token, 'Must return auth token');
  assert.equal(data.user.username, generatedUsername);
  console.log('✓ Test 4 Passed: Login with generated username verified.');
}

// Test 5: User Login using Email Address (Dual Login)
{
  const { req, res } = createMockReqRes({
    username: testEmail, // User enters email into identifier/username field
    password: testPassword,
  });

  await login(req, res);
  assert.equal(res.getStatus(), 200, 'Should allow login with email address');
  const data = res.getData();
  assert.ok(data.token, 'Must return auth token');
  assert.equal(data.user.email, testEmail.toLowerCase());
  console.log('✓ Test 5 Passed: Dual login using registered email address verified.');
}

// Test 6: Rejection of Invalid Credentials
{
  // Wrong password
  const { req: wrongPassReq, res: wrongPassRes } = createMockReqRes({
    username: generatedUsername,
    password: 'IncorrectPassword',
  });
  await login(wrongPassReq, wrongPassRes);
  assert.equal(wrongPassRes.getStatus(), 401, 'Should reject invalid password');

  // Non-existent user
  const { req: noUserReq, res: noUserRes } = createMockReqRes({
    username: 'NonExistentSleuth_9999',
    password: testPassword,
  });
  await login(noUserReq, noUserRes);
  assert.equal(noUserRes.getStatus(), 401, 'Should reject non-existent user');

  console.log('✓ Test 6 Passed: Invalid credentials securely rejected with 401.');
}

// Test 7: Password Security & Password Change
{
  const userRecord = await User.findOne({ email: testEmail });
  const newPassword = 'NewSecretPassword2026!';

  // Current password mismatch
  const { req: badCurrentReq, res: badCurrentRes } = createMockReqRes(
    {
      currentPassword: 'WrongCurrentPassword',
      newPassword,
      confirmNewPassword: newPassword,
    },
    {},
    userRecord
  );
  await changePassword(badCurrentReq, badCurrentRes);
  assert.equal(badCurrentRes.getStatus(), 401, 'Should reject incorrect current password');

  // Successful change
  const { req: goodReq, res: goodRes } = createMockReqRes(
    {
      currentPassword: testPassword,
      newPassword,
      confirmNewPassword: newPassword,
    },
    {},
    userRecord
  );
  await changePassword(goodReq, goodRes);
  assert.equal(goodRes.getStatus(), 200, 'Should succeed on correct password update');
  assert.ok(goodRes.getData().success);

  // Verify login now works with new password
  const { req: newLoginReq, res: newLoginRes } = createMockReqRes({
    username: testEmail,
    password: newPassword,
  });
  await login(newLoginReq, newLoginRes);
  assert.equal(newLoginRes.getStatus(), 200, 'Must allow login with new password');

  // Verify old password no longer works
  const { req: oldLoginReq, res: oldLoginRes } = createMockReqRes({
    username: testEmail,
    password: testPassword,
  });
  await login(oldLoginReq, oldLoginRes);
  assert.equal(oldLoginRes.getStatus(), 401, 'Old password must be invalidated');

  console.log('✓ Test 7 Passed: Password change securely updates bcrypt hash and invalidates old password.');
}

// Test 8: Session Token Verification & User Profile
{
  const userRecord = await User.findOne({ email: testEmail });
  const { req, res } = createMockReqRes({}, {}, userRecord);

  await getMe(req, res);
  assert.equal(res.getStatus(), 200, 'getMe should return user dossier');
  const profile = res.getData().user;
  assert.equal(profile.email, testEmail.toLowerCase());
  assert.ok(profile.currentSession, 'Current session must be tracked');
  assert.equal(typeof profile.stats.rank, 'string', 'User rank must be computed');

  console.log('✓ Test 8 Passed: User session verification, rank computation, and profile retrieval verified.');
}

console.log('--- ALL USER AUTHENTICATION & ACCOUNT MANAGEMENT TESTS PASSED SUCCESSFULLY! ---');
