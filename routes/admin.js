var express = require('express');
var router = express.Router();
const { PrismaClient } = require("@prisma/client")
const session = require('express-session');
var prisma = new PrismaClient();
const Joi = require('joi');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// Mock the DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;

// Access the required elements and convert the code
const passwordInput = document.querySelector(".pass-field input");
const requirementList = document.querySelectorAll(".requirement-list li");
const requirements = [
  { regex: /.{8,}/, index: 0 },
  { regex: /[0-9]/, index: 1 },
  { regex: /[a-z]/, index: 2 },
  { regex: /[A-Z]/, index: 3 },
  { regex: /[^A-Za-z0-9]/, index: 4 },
];

function simulateKeyupEvent(value) {
  requirements.forEach((item) => {
    const isValid = item.regex.test(value);
    const requirementItem = requirementList[item.index];

    if (isValid) {
      requirementItem.classList.add("valid");
      requirementItem.firstElementChild.className = "fa-solid fa-check";
    } else {
      requirementItem.classList.remove("valid");
      requirementItem.firstElementChild.className = "fa-solid fa-circle";
    }
  });
}

// Define the validation schema using Joi
const managerSchema = Joi.object({
  firstName: Joi.string().required(),
  middleName: Joi.string().allow(''),
  lastName: Joi.string().required(),
  contact: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Add session middleware
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

function validateSession(req, res, next) {
  if (req.session.adminId) {
    // User is logged in
    next();
  } else {
    // User is not logged in, redirect to login page
    res.redirect('/login');
  }
}

/* GET admin dashboard */
router.get('/admin/dashboard', validateSession, async function(req, res, next) {
  try {
    const managers = await prisma.manager.findMany();
    res.render('admin/dashboard', { title: 'Express', managers });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/add-manager', validateSession, function(req, res, next) { 
  res.render('admin/add-manager'); 
});

// POST add manager
router.post('/add-manager', validateSession, async function(req, res, next) {
  try {
    // Validate the request body against the defined schema
    const { error, value } = managerSchema.validate(req.body);
    if (error) {
      // If validation fails, redirect back to the add manager page with an error message
      return res.redirect('/admin/add-manager');
    }

    const { firstName, middleName, lastName, contact, email, password } = value;

    // Sanitize the inputs
    const sanitizedFirstName = validator.escape(firstName);
    const sanitizedMiddleName = validator.escape(middleName);
    const sanitizedLastName = validator.escape(lastName);
    const sanitizedContact = validator.escape(contact);
    const sanitizedEmail = validator.normalizeEmail(email);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new manager in the database
    const newManager = await prisma.manager.create({
      data: {
        firstName: sanitizedFirstName,
        middleName: sanitizedMiddleName,
        lastName: sanitizedLastName,
        contact: sanitizedContact,
        email: sanitizedEmail,
        password: hashedPassword,
      },
    });

    res.redirect('/admin/dashboard'); // Redirect to the managers list page
  } catch (error) {
    console.error(error);
    res.redirect('/admin/add-manager'); // Redirect back to the add manager page in case of an error
  }
});

// POST delete manager
router.post('/admin/delete', validateSession, async function(req, res, next) {
  const { managerId } = req.body;

  try {
    // Find the manager to be deleted
    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      return res.status(404).send('Manager not found');
    }

    // Delete the manager
    await prisma.manager.delete({
      where: { id: managerId },
    });
    console.log("SUCCESS")
    res.redirect('/admin/dashboard');
    
  } catch (error) {
    console.error(error);
    console.log("error")
    res.status(500).send('Internal Server Error');
    
  }
});

// GET route to render the edit manager page
router.get('/admin/edit-manager', validateSession, async function(req, res, next) {
  const { managerId } = req.query;

  try {
    // Find the manager to be edited
    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      return res.status(404).send('Manager not found');
    }

    res.render('admin/edit-manager', { manager });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// POST route to update the manager
router.post('/admin/edit-manager', validateSession, async function(req, res, next) {
  const { managerId, firstName, middleName, lastName, contact, email, password } = req.body;

  try {
    // Find the manager to be updated
    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      return res.status(404).send('Manager not found');
    }

    // Update the manager
    const updatedManager = await prisma.manager.update({
      where: { id: managerId },
      data: {
        firstName,
        middleName,
        lastName,
        contact,
        email,
        password,
      },
    });

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// GET route to render the admin pets page
router.get('/admin/pets', validateSession, async function(req, res, next) {
  try {
    const pets = await prisma.pet.findMany(); // Fetch all pet records
    res.render('admin/pets', { title: 'Express', pets });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
