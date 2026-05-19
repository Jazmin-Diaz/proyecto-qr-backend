const crypto = require("crypto");
const mongoose = require("mongoose");

const Historial = require("../models/Historial");
const Usuario = require("../models/Usuario");

const TIPOS_VALIDOS = ["generated", "scanned"];
const LIMITE_HISTORIAL = 100;

const hashearToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const sanitizarItem = (item) => ({
  id: item._id,
  value: item.valor,
  tipo: item.tipo,
  usuario: item.usuario,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const esObjectIdValido = (id) => mongoose.Types.ObjectId.isValid(id);

const validarUsuario = async (usuarioId) => {
  if (!esObjectIdValido(usuarioId)) {
    return null;
  }

  return Usuario.findById(usuarioId).select("_id");
};

const obtenerUsuarioAutenticado = async (req) => {
  const authHeader = req.headers.authorization || "";
  const [tipo, token] = authHeader.split(" ");

  if (tipo !== "Bearer" || !token) {
    return null;
  }

  return Usuario.findOne({ sessionTokenHash: hashearToken(token) })
    .select("+sessionTokenHash")
    .lean();
};

const validarAccesoUsuario = async (req, res, usuarioId) => {
  const usuario = await validarUsuario(usuarioId);
  if (!usuario) {
    res.status(404).json({ mensaje: "Usuario no encontrado" });
    return false;
  }

  const usuarioAutenticado = await obtenerUsuarioAutenticado(req);
  if (!usuarioAutenticado || usuarioAutenticado._id.toString() !== usuarioId) {
    res.status(401).json({ mensaje: "Sesion no valida" });
    return false;
  }

  return true;
};

const obtenerHistorial = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { tipo } = req.query;

    const tieneAcceso = await validarAccesoUsuario(req, res, usuarioId);
    if (!tieneAcceso) {
      return;
    }

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        mensaje: "El tipo debe ser generated o scanned",
      });
    }

    const filtro = { usuario: usuarioId };
    if (tipo) {
      filtro.tipo = tipo;
    }

    const items = await Historial.find(filtro)
      .sort({ createdAt: -1 })
      .limit(LIMITE_HISTORIAL);

    return res.json(items.map(sanitizarItem));
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener el historial",
      error: error.message,
    });
  }
};

const crearItemHistorial = async (req, res) => {
  try {
    const { usuarioId, tipo, valor } = req.body;

    if (!usuarioId || !tipo || !valor) {
      return res.status(400).json({
        mensaje: "usuarioId, tipo y valor son obligatorios",
      });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        mensaje: "El tipo debe ser generated o scanned",
      });
    }

    const valorNormalizado = valor.trim();
    if (!valorNormalizado) {
      return res.status(400).json({
        mensaje: "El valor del historial no puede estar vacio",
      });
    }

    const tieneAcceso = await validarAccesoUsuario(req, res, usuarioId);
    if (!tieneAcceso) {
      return;
    }

    const item = await Historial.create({
      usuario: usuarioId,
      tipo,
      valor: valorNormalizado,
    });

    const totalItems = await Historial.countDocuments({
      usuario: usuarioId,
      tipo,
    });

    if (totalItems > LIMITE_HISTORIAL) {
      const itemsAntiguos = await Historial.find({ usuario: usuarioId, tipo })
        .sort({ createdAt: -1 })
        .skip(LIMITE_HISTORIAL)
        .select("_id");

      await Historial.deleteMany({
        _id: { $in: itemsAntiguos.map((itemAntiguo) => itemAntiguo._id) },
      });
    }

    return res.status(201).json({
      mensaje: "Historial guardado correctamente",
      item: sanitizarItem(item),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al guardar el historial",
      error: error.message,
    });
  }
};

const limpiarHistorial = async (req, res) => {
  try {
    const { usuarioId, tipo } = req.params;

    const tieneAcceso = await validarAccesoUsuario(req, res, usuarioId);
    if (!tieneAcceso) {
      return;
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        mensaje: "El tipo debe ser generated o scanned",
      });
    }

    await Historial.deleteMany({ usuario: usuarioId, tipo });

    return res.json({
      mensaje: "Historial eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al eliminar el historial",
      error: error.message,
    });
  }
};

module.exports = {
  crearItemHistorial,
  limpiarHistorial,
  obtenerHistorial,
};
