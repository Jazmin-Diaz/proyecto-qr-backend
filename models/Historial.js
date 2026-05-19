const mongoose = require("mongoose");

const historialSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["generated", "scanned"],
      required: true,
      index: true,
    },
    valor: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

historialSchema.index({ usuario: 1, tipo: 1, createdAt: -1 });

module.exports = mongoose.model("Historial", historialSchema);
