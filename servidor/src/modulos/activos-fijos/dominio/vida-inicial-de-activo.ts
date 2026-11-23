/** Lo que un activo recién creado todavía no tiene: ocio, baja, libros, responsable con usuario y foto. */
export const SIN_HISTORIA = {
  ocioso: false,
  ociosoDesde: null,
  motivoDeOcio: null,
  fechaDeBaja: null,
  porcentajeFiscal: null,
  vidaUtilContableMeses: null,
  valorResidual: null,
  responsableUsuarioId: null,
  fotoArchivoId: null,
} as const;

/** Lo que un activo en construcción no tiene: uso, parámetros de depreciación ni marca de ocioso. */
export const SIN_USO = {
  fechaDeInicioDeUso: null,
  ocioso: false,
  ociosoDesde: null,
  motivoDeOcio: null,
  porcentajeFiscal: null,
  vidaUtilContableMeses: null,
  valorResidual: null,
} as const;
