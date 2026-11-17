/** Textos de la pantalla «Constancias pendientes» (R12). */
export const VENTANA_DE_CONSTANCIAS_PENDIENTES = {
  titulo: 'Constancias pendientes',
  descripcion:
    'Las retenciones que ya se practicaron y todavía no tienen constancia, de todos los meses, con el plazo de cada una.',
  hasta: 'Hasta el mes',
  grupo: 'Grupo de entero',
  proveedor: 'Proveedor',
  vacio: 'No hay constancias pendientes',
  vacioAyuda:
    'Todas las retenciones practicadas hasta ese mes ya tienen constancia. Si espera ver alguna, cambie el mes o quite los filtros.',
  anuladas: 'Retenciones de documentos anulados',
  anuladasAyuda:
    'No suman al total. Resuélvalas en «Por resolver»: si ya tienen constancia o entero, hay que anular la constancia o rectificar.',
  leyenda:
    'Los días son de calendario. El plazo de la constancia del ISR es el 5.º día hábil del mes siguiente (Código Tributario, art. 8); el IVA no tiene plazo propio confirmado y se guía por el del entero.',
} as const;
