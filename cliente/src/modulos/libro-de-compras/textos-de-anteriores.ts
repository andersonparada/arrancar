/** Textos de los DTE emitidos antes de la fecha de inicio de la empresa (bandeja y conciliación). */
export const ANTERIORES_A_LA_FECHA_DE_INICIO = {
  marca: 'Antes de la fecha de inicio',
  marcaEnPlazo: 'Antes de la fecha de inicio · en plazo de crédito',
  /** La salvedad del contador: lo anterior debe estar en el libro del sistema anterior. */
  ayuda:
    'De antes de la fecha de inicio: deben estar en el libro del sistema anterior. Si alguno no lo está, regístrelo aquí (con el aviso de fecha anterior).',
  enPlazo: 'Emitido en los dos meses anteriores al de la fecha de inicio: revise que esté en el sistema anterior.',
  mostrar: 'Mostrar',
  ocultar: 'Ocultar',
  mostrandoTodos: 'Se muestran también los DTE de antes de la fecha de inicio.',
  grupo: 'DTE de antes de la fecha de inicio',
  registrar: 'Registrar aquí',
  notaSinFactura: 'Si su factura es de antes de la fecha de inicio, regístrela desde el formulario.',
} as const;
