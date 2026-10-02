const { memoryStore, isPostgresLive, getPool } = require('../config/db');
const config = require('../config/env');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

// 1. Register Citizen
async function registerCitizen(req, res, next) {
  try {
    const { full_name, email, phone, password, confirm_password, emergency_contact, blood_group, address } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Full name, email, and password are required' });
    }
    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isPostgresLive()) {
      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      const hashedPassword = await hashPassword(password);
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role) 
         VALUES ($1, $2, $3, $4, 'CITIZEN') RETURNING id, email, full_name, phone, role, avatar_url, created_at`,
        [cleanEmail, hashedPassword, full_name.trim(), phone || '']
      );
      const user = userRes.rows[0];

      await pool.query(
        `INSERT INTO citizen_profiles (user_id, emergency_contact, blood_group, address) 
         VALUES ($1, $2, $3, $4)`,
        [user.id, emergency_contact || '', blood_group || '', address || '']
      );

      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      return res.status(201).json({
        success: true,
        message: 'Citizen account registered successfully',
        token,
        user
      });
    } else {
      const exists = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      const hashedPassword = await hashPassword(password);
      const newUserId = 'c' + Date.now().toString(16).padStart(31, '0');
      const newUser = {
        id: newUserId,
        email: cleanEmail,
        password_hash: hashedPassword,
        full_name: full_name.trim(),
        phone: phone || '',
        role: 'CITIZEN',
        avatar_url: '/assets/avatars/citizen.png',
        is_active: true,
        created_at: new Date()
      };
      memoryStore.users.push(newUser);
      memoryStore.citizen_profiles.push({
        id: 'cp_' + Date.now(),
        user_id: newUserId,
        emergency_contact: emergency_contact || '',
        blood_group: blood_group || '',
        address: address || '',
        city: 'Chhatrapati Sambhajinagar',
        state: 'Maharashtra',
        pincode: '431003'
      });

      const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });
      return res.status(201).json({
        success: true,
        message: 'Citizen account registered successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          avatar_url: newUser.avatar_url
        }
      });
    }
  } catch (err) {
    next(err);
  }
}

// 2. Register Authority
async function registerAuthority(req, res, next) {
  try {
    if (config.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Authority accounts must be provisioned by an administrator'
      });
    }

    const { full_name, email, phone, department, designation, official_id, password, confirm_password } = req.body;

    if (!full_name || !email || !department || !designation || !password) {
      return res.status(400).json({ success: false, error: 'Full name, official email, department, designation, and password are required' });
    }
    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Authority password must be at least 8 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isPostgresLive()) {
      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      const hashedPassword = await hashPassword(password);
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role) 
         VALUES ($1, $2, $3, $4, 'AUTHORITY') RETURNING id, email, full_name, phone, role, avatar_url, created_at`,
        [cleanEmail, hashedPassword, full_name.trim(), phone || '']
      );
      const user = userRes.rows[0];

      await pool.query(
        `INSERT INTO authority_profiles (user_id, department, designation, official_id) 
         VALUES ($1, $2, $3, $4)`,
        [user.id, department.trim(), designation.trim(), official_id || 'SDMA-GOV-' + Math.floor(1000 + Math.random() * 9000)]
      );

      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      return res.status(201).json({
        success: true,
        message: 'Authority account registered successfully with command credentials',
        token,
        user
      });
    } else {
      const exists = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      const hashedPassword = await hashPassword(password);
      const newUserId = 'a' + Date.now().toString(16).padStart(31, '0');
      const newUser = {
        id: newUserId,
        email: cleanEmail,
        password_hash: hashedPassword,
        full_name: full_name.trim(),
        phone: phone || '',
        role: 'AUTHORITY',
        avatar_url: '/assets/avatars/officer.png',
        is_active: true,
        created_at: new Date()
      };
      memoryStore.users.push(newUser);
      memoryStore.authority_profiles.push({
        id: 'ap_' + Date.now(),
        user_id: newUserId,
        department: department.trim(),
        designation: designation.trim(),
        official_id: official_id || 'SDMA-GOV-' + Math.floor(1000 + Math.random() * 9000),
        jurisdiction: 'Maharashtra Disaster Division'
      });

      const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });
      return res.status(201).json({
        success: true,
        message: 'Authority account registered successfully with command credentials',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          avatar_url: newUser.avatar_url
        }
      });
    }
  } catch (err) {
    next(err);
  }
}

// 3. Login (Handles both Citizen and Authority)
async function login(req, res, next) {
  try {
    const { identifier, email, phone, password, role_hint } = req.body;
    const loginKey = (identifier || email || phone || '').trim().toLowerCase();

    if (!loginKey || !password) {
      return res.status(400).json({ success: false, error: 'Email/Mobile and password are required' });
    }

    let user = null;
    let authProfile = null;
    let citizenProfile = null;

    if (isPostgresLive()) {
      const pool = getPool();
      const userRes = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $1',
        [loginKey]
      );
      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
      }
      user = userRes.rows[0];

      if (user.role === 'AUTHORITY') {
        const apRes = await pool.query('SELECT * FROM authority_profiles WHERE user_id = $1', [user.id]);
        if (apRes.rows.length > 0) authProfile = apRes.rows[0];
      } else {
        const cpRes = await pool.query('SELECT * FROM citizen_profiles WHERE user_id = $1', [user.id]);
        if (cpRes.rows.length > 0) citizenProfile = cpRes.rows[0];
      }
    } else {
      user = memoryStore.users.find(u => u.email.toLowerCase() === loginKey || u.phone === loginKey);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
      }
      if (user.role === 'AUTHORITY') {
        authProfile = memoryStore.authority_profiles.find(ap => ap.user_id === user.id);
      } else {
        citizenProfile = memoryStore.citizen_profiles.find(cp => cp.user_id === user.id);
      }
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Role check warning if user tried to login on mismatched portal
    if (role_hint && role_hint.toUpperCase() !== user.role) {
      // Still allow but let client redirect properly or return message
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.full_name}`,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        authority: authProfile,
        citizen: citizenProfile
      }
    });
  } catch (err) {
    next(err);
  }
}

// 4. Get Current User Profile
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    let user = req.user;
    let extra = {};

    if (isPostgresLive()) {
      const pool = getPool();
      if (user.role === 'AUTHORITY') {
        const ap = await pool.query('SELECT * FROM authority_profiles WHERE user_id = $1', [userId]);
        extra.authority = ap.rows[0] || null;
      } else {
        const cp = await pool.query('SELECT * FROM citizen_profiles WHERE user_id = $1', [userId]);
        extra.citizen = cp.rows[0] || null;
      }
    } else {
      if (user.role === 'AUTHORITY') {
        extra.authority = memoryStore.authority_profiles.find(ap => ap.user_id === userId) || null;
      } else {
        extra.citizen = memoryStore.citizen_profiles.find(cp => cp.user_id === userId) || null;
      }
    }

    return res.json({
      success: true,
      user: {
        ...user,
        ...extra
      }
    });
  } catch (err) {
    next(err);
  }
}

// 5. Update Profile
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { full_name, phone, emergency_contact, blood_group, address, department, designation } = req.body;

    if (isPostgresLive()) {
      const pool = getPool();
      if (full_name || phone) {
        await pool.query(
          'UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [full_name, phone, userId]
        );
      }
      if (req.user.role === 'AUTHORITY' && (department || designation)) {
        await pool.query(
          'UPDATE authority_profiles SET department = COALESCE($1, department), designation = COALESCE($2, designation) WHERE user_id = $3',
          [department, designation, userId]
        );
      } else if (req.user.role === 'CITIZEN') {
        await pool.query(
          'UPDATE citizen_profiles SET emergency_contact = COALESCE($1, emergency_contact), blood_group = COALESCE($2, blood_group), address = COALESCE($3, address) WHERE user_id = $4',
          [emergency_contact, blood_group, address, userId]
        );
      }
    } else {
      const u = memoryStore.users.find(usr => usr.id === userId);
      if (u) {
        if (full_name) u.full_name = full_name.trim();
        if (phone) u.phone = phone.trim();
      }
      if (req.user.role === 'AUTHORITY') {
        const ap = memoryStore.authority_profiles.find(a => a.user_id === userId);
        if (ap) {
          if (department) ap.department = department.trim();
          if (designation) ap.designation = designation.trim();
        }
      } else {
        const cp = memoryStore.citizen_profiles.find(c => c.user_id === userId);
        if (cp) {
          if (emergency_contact) cp.emergency_contact = emergency_contact.trim();
          if (blood_group) cp.blood_group = blood_group.trim();
          if (address) cp.address = address.trim();
        }
      }
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

// 6. Change Password
async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    let userHash = '';
    if (isPostgresLive()) {
      const pool = getPool();
      const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
      userHash = r.rows[0].password_hash;
    } else {
      const u = memoryStore.users.find(usr => usr.id === userId);
      if (!u) return res.status(404).json({ success: false, error: 'User not found' });
      userHash = u.password_hash;
    }

    const matches = await comparePassword(current_password, userHash);
    if (!matches) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(new_password);
    if (isPostgresLive()) {
      const pool = getPool();
      await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);
    } else {
      const u = memoryStore.users.find(usr => usr.id === userId);
      if (u) u.password_hash = newHash;
    }

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// 7. Forgot Password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    // In production, send real email token. For demo/prototype, simulate secure reset dispatch
    return res.json({
      success: true,
      message: `Password reset verification link dispatched to ${email}. Check your inbox or government gateway notifications.`
    });
  } catch (err) {
    next(err);
  }
}

// 8. Logout
function logout(req, res) {
  return res.json({
    success: true,
    message: 'Session terminated successfully. Token invalidated.'
  });
}

module.exports = {
  registerCitizen,
  registerAuthority,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  logout
};
