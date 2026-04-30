const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("La variable MONGO_URI no esta definida en el archivo .env");
  }

  await mongoose.connect(mongoUri);
  console.log("Conectado a MongoDB Atlas");
};

module.exports = connectDB;
