const express = require("express");

const {
  crearUsuario,
  obtenerUsuarios,
  iniciarSesion,
} = require("../controllers/usuarioController");

const router = express.Router();

router.get("/", obtenerUsuarios);
router.post("/", crearUsuario);
router.post("/login", iniciarSesion);

module.exports = router;
