const Usuario = require("../models/Usuario");

const sanitizarUsuario = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  correo: usuario.correo,
  createdAt: usuario.createdAt,
  updatedAt: usuario.updatedAt,
});

const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({
        mensaje: "nombre, correo y password son obligatorios",
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const usuarioExistente = await Usuario.findOne({
      correo: correoNormalizado,
    });

    if (usuarioExistente) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con ese correo",
      });
    }

    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      correo: correoNormalizado,
      password,
    });

    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: sanitizarUsuario(usuario),
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      if (error?.errors?.password?.kind === "minlength") {
        return res.status(400).json({
          mensaje: "La contraseña debe tener al menos 6 caracteres",
        });
      }

      const validationMessage =
        Object.values(error.errors || {})[0]?.message ||
        "Datos de registro no validos";

      return res.status(400).json({
        mensaje: validationMessage,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con ese correo",
      });
    }

    return res.status(500).json({
      mensaje: "Error al crear el usuario",
      error: error.message,
    });
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .sort({ createdAt: -1 })
      .select("-password");
    return res.json(usuarios);
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener los usuarios",
      error: error.message,
    });
  }
};

const iniciarSesion = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        mensaje: "correo y password son obligatorios",
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({ correo: correoNormalizado });

    if (!usuario || usuario.password !== password) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas",
      });
    }

    return res.json({
      mensaje: "Inicio de sesión correcto",
      usuario: sanitizarUsuario(usuario),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  iniciarSesion,
};
