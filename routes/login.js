var express = require('express');
var router = express.Router();
const { PrismaClient } = require("@prisma/client")
const session = require('express-session');
const bcrypt = require('bcrypt');
const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
var prisma = new PrismaClient();

// Initialize the session middleware
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: threeDays
  }
}));

router.get('/login', async function(req, res, next) {
  // Check if the admin or manager is logged in
  if (req.session.adminId) {
    // Redirect to the admin dashboard
    return res.redirect('/admin/dashboard');
  }

  if (req.session.managerId) {
    // Redirect to the manager dashboard
    return res.redirect('/manager/dashboard');
  }

  // Render the login page
  res.render('login', { title: 'Express' });
});

/* POST login */
router.post('/login', async function(req, res, next) {
  try {
    const { email, password } = req.body;
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    if (admin) {
      if (admin.password === password) {
        // Admin login successful
        req.session.adminId = admin.id; // Store admin ID in session
        return res.redirect('/admin/dashboard');
      } 
    }

    const manager = await prisma.manager.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    if (manager) {
      const isPasswordValid = await bcrypt.compare(password, manager.password);
      if (isPasswordValid) {
        // Manager login successful
        req.session.managerId = manager.id; // Store manager ID in session
        return res.redirect('/manager/dashboard');
      }
    }

    // Incorrect email or password
    return res.render('login', { error: 'Incorrect email or password' });
  } catch (error) {
    console.error(error);
    return res.render('login', { error: 'An error occurred' });
  }
});

router.get('/admin/logout', function(req, res, next) {
  // Clear admin ID from session
  req.session.adminId = null;
  res.redirect('/login');
});

router.get('/manager/logout', function(req, res, next) {
  // Clear manager ID from session
  req.session.managerId = null;
  res.redirect('/login');
});

module.exports = router;
