const express = require("express");

const {
  crearItemHistorial,
  limpiarHistorial,
  obtenerHistorial,
} = require("../controllers/historialController");

const router = express.Router();

router.get("/:usuarioId", obtenerHistorial);
router.post("/", crearItemHistorial);
router.delete("/:usuarioId/:tipo", limpiarHistorial);

module.exports = router;
