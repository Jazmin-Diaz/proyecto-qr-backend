const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const usuarioRoutes = require("./routes/usuarioRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "API funcionando",
    endpoints: {
      usuarios: "/api/usuarios",
    },
  });
});

app.use("/api/usuarios", usuarioRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  });
