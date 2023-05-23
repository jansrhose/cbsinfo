var express = require('express');
var router = express.Router();
const Joi = require('joi');
const { sanitize } = require('validator');
const {PrismaClient} = require("@prisma/client")
var prisma = new PrismaClient

/* GET home page. */
router.get('/manager/dashboard', async function(req, res, next) {
  try {
    const managerId = req.session.managerId; // Retrieve manager ID from session

    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });

    const pets = await prisma.pet.findMany({
      where: { managerId },
    });

    res.render('manager/dashboard', { title: 'Express', manager, pets });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// GET add pet page
router.get('/add-pet', async function(req, res, next) {
  try {
    
    const managerId = req.session.managerId; // Retrieve manager ID from session

    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });
    
    res.render('manager/add-pet', { manager });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

 
// POST add pet
router.post('/add-pet', async function(req, res, next) {
  try {
    const { petName, breed, age, gender, service, owner, contact, email, weight } = req.body;
    const managerId = req.session.managerId; // Retrieve manager ID from session

    // Define validation schema
    const schema = Joi.object({
      petName: Joi.string().required(),
      breed: Joi.string().required(),
      age: Joi.number().integer().min(0).required(),
      gender: Joi.string().valid('male', 'female').required(),
      service: Joi.string().required(),
      owner: Joi.string().required(),
      contact: Joi.string().required(),
      email: Joi.string().email().required(),
      weight: Joi.number().positive().required(),
    });
   
    // Validate the input values against the schema
    const { error, value } = schema.validate(
      { petName, breed, age, gender:gender.toLowerCase(), service, owner, contact, email, weight },
      { abortEarly: false } // Return all validation errors
    );
      
    if (error) {
      // Handle validation errors
      console.log(error)
      const validationErrors = error.details.map((err) => err.message);
      return res.render('add-pet', { error: validationErrors });
    }

    // Destructure the validated values
    const { petName: validatedPetName, breed: validatedBreed, age: validatedAge, gender: validatedGender,
      service: validatedService, owner: validatedOwner, contact: validatedContact, email: validatedEmail,
      weight: validatedWeight } = value;

    await prisma.pet.create({
      data: {
        petName: validatedPetName,
        breed: validatedBreed,
        age: validatedAge,
        gender: validatedGender,
        service: validatedService,
        owner: validatedOwner,
        contact: validatedContact,
        email: validatedEmail,
        weight: validatedWeight,
        manager: { connect: { id: managerId } }, // Connect the pet to the manager
      },
    });

    res.redirect('/manager/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// POST delete pet
router.post('/manager/delete', async function(req, res, next) {
  const { petId } = req.body;

  try {
    // Find the pet to be deleted
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet) {
      return res.status(404).send('Pet not found');
    }

    // Delete the pet
    await prisma.pet.delete({
      where: { id: petId },
    });

    // Redirect to the dashboard or show a success message
    res.redirect('/manager/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// GET edit pet page
router.get('/manager/edit-pet', async function(req, res, next) {
  const { petId } = req.query;
  const managerId = req.session.managerId; // Retrieve manager ID from session

  try {
    // Find the pet to be edited
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet) {
      return res.status(404).send('Pet not found');
    }

    // Render the edit pet form with the pet and manager ID
    res.render('manager/edit-pet', { pet, managerId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


  
// POST edit pet
router.post('/manager/edit-pet', async function(req, res, next) {
  const { petId, petName, breed, age, gender, service, owner, contact, email, weight } = req.body;
  const managerId = req.session.managerId; // Retrieve manager ID from session

  try {
    // Find the pet to be edited
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet) {
      return res.status(404).send('Pet not found');
    }

    // Update the pet with the new data
    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        petName,
        breed,
        age: parseInt(age),
        gender,
        service,
        owner,
        contact,
        email,
        weight: parseFloat(weight),
        managerId,
      },
    });

    // Redirect to the dashboard or show a success message
    res.redirect('/manager/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

  

module.exports = router;
