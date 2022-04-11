require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

/* DB MODELS */

/* ---------------------------------- */

/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const authRoutes = require('./src/route/authRoutes');
const roomRoutes = require('./src/route/roomRoutes');

/* ---------------------------------- */

const app = express();
const PORT = process.env.PORT || 3001;
const uri = process.env.MONGO_URL || 'mongodb://localhost:27017/wordChainDev';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
/* Disable Cors */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

/* DB connection */
console.log(uri);
mongoose.connect(uri, {
  useNewUrlParser: true,
});
/* ---------------------------------- */


app.use(authRoutes);
app.use(roomRoutes);

app.listen(PORT, () => {
  console.log(PORT, "Sunucu çalışıyor...");
});
