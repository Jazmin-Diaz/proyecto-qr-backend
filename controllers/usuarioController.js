const crypto = require("crypto");

const Usuario = require("../models/Usuario");

const generarToken = () => crypto.randomBytes(32).toString("hex");

const hashearToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const hashearPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${hash}`;
};

const verificarPassword = (password, passwordGuardada) => {
  if (!passwordGuardada?.startsWith("scrypt$")) {
    return password === passwordGuardada;
  }

  const [, salt, hashGuardado] = passwordGuardada.split("$");
  const hash = crypto.scryptSync(password, salt, 64);
  const hashGuardadoBuffer = Buffer.from(hashGuardado, "hex");

  return (
    hash.length === hashGuardadoBuffer.length &&
    crypto.timingSafeEqual(hash, hashGuardadoBuffer)
  );
};

const crearSesion = async (usuario) => {
  const token = generarToken();

  usuario.sessionTokenHash = hashearToken(token);
  usuario.sessionTokenCreatedAt = new Date();
  await usuario.save();

  return token;
};

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
      password: hashearPassword(password),
    });
    const token = await crearSesion(usuario);

    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: sanitizarUsuario(usuario),
      token,
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

    if (!usuario || !verificarPassword(password, usuario.password)) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas",
      });
    }

    if (!usuario.password.startsWith("scrypt$")) {
      usuario.password = hashearPassword(password);
    }

    return res.json({
      mensaje: "Inicio de sesión correcto",
      usuario: sanitizarUsuario(usuario),
      token: await crearSesion(usuario),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al iniciar sesión",
      error: error.message,
    });
  }
};

const obtenerSesion = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [tipo, token] = authHeader.split(" ");

    if (tipo !== "Bearer" || !token) {
      return res.status(401).json({
        mensaje: "Sesion no valida",
      });
    }

    const usuario = await Usuario.findOne({
      sessionTokenHash: hashearToken(token),
    }).select("+sessionTokenHash +sessionTokenCreatedAt");

    if (!usuario) {
      return res.status(401).json({
        mensaje: "Sesion no valida",
      });
    }

    return res.json({
      mensaje: "Sesion activa",
      usuario: sanitizarUsuario(usuario),
      token,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener la sesion",
      error: error.message,
    });
  }
};

const cerrarSesion = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [tipo, token] = authHeader.split(" ");

    if (tipo === "Bearer" && token) {
      await Usuario.updateOne(
        { sessionTokenHash: hashearToken(token) },
        {
          $set: {
            sessionTokenHash: null,
            sessionTokenCreatedAt: null,
          },
        }
      );
    }

    return res.json({
      mensaje: "Sesion cerrada correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al cerrar sesion",
      error: error.message,
    });
  }
};

module.exports = {
  cerrarSesion,
  crearUsuario,
  obtenerSesion,
  obtenerUsuarios,
  iniciarSesion,
};
