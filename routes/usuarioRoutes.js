const express = require("express");

const {
  cerrarSesion,
  crearUsuario,
  obtenerSesion,
  obtenerUsuarios,
  iniciarSesion,
} = require("../controllers/usuarioController");

const router = express.Router();

router.get("/", obtenerUsuarios);
router.get("/sesion", obtenerSesion);
router.post("/", crearUsuario);
router.post("/login", iniciarSesion);
router.post("/logout", cerrarSesion);

module.exports = router;
