var express = require('express');
var router = express.Router();
const {PrismaClient} = require("@prisma/client")
var prisma = new PrismaClient

/* GET home page. */
router.get('/',  async function(req, res, next) { 

  res.render('index', { title: 'Express'});
});

module.exports = router;
