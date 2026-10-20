import type {
  AccionSugerida,
  EstadoDelEntero,
  FiltroDeConstancia,
  FiltroDeDocumentos,
  GrupoDeEntero,
  ResolucionDeRetencion,
} from './servicios/retenciones.api';

export const VENTANA_DE_RETENCIONES = {
  titulo: 'Retenciones',
  descripcion: 'Lo retenido cada mes, sus constancias, lo que falta resolver y los pagos a la SAT.',
  exportar: 'Exportar a Excel',
  imprimir: 'Imprimir',
  mes: 'Mes',
  grupo: 'Grupo de entero',
  constancia: 'Constancia',
  documentos: 'Documentos',
  todosLosGrupos: 'Todos los grupos',
  anotarConstancias: 'Anotar constancias',
  vacio: 'No hay retenciones con estos filtros',
  vacioAyuda:
    'Las retenciones salen de las compras registradas en Documentos de compra. Cambie el mes o quite los filtros.',
  anuladas: 'Retenciones de documentos anulados',
  anuladasAyuda:
    'No suman a lo retenido del mes. Si tienen constancia o ya se enteraron, resuélvalas en «Por resolver».',
} as const;

export const PESTANAS_DE_RETENCIONES = {
  mes: 'Del mes',
  porResolver: 'Por resolver',
  enteros: 'Pagos a la SAT',
} as const;

/** Nombres cortos de los grupos para encabezados; el servidor manda el largo. */
export const NOMBRES_CORTOS_DE_GRUPOS: Record<GrupoDeEntero, string> = {
  iva_agentes: 'IVA de agentes',
  isr_opcional: 'ISR opcional simplificado',
  iva_factura_especial: 'IVA de factura especial',
  isr_factura_especial: 'ISR de factura especial',
};

export const NOMBRES_DE_ESTADOS: Record<EstadoDelEntero, string> = {
  sin_retenciones: 'Sin retenciones',
  pendiente: 'Pendiente',
  vencido: 'Vencido',
  enterado: 'Enterado',
  con_diferencia: 'Con diferencia',
};

export const NOMBRES_DE_FILTRO_DE_CONSTANCIA: Record<FiltroDeConstancia, string> = {
  con: 'Con constancia',
  sin: 'Sin constancia',
  todas: 'Todas',
};

export const NOMBRES_DE_FILTRO_DE_DOCUMENTOS: Record<FiltroDeDocumentos, string> = {
  anulados: 'Anulados',
  todos: 'Todos',
  vigentes: 'Vigentes',
};

export const VENTANA_DE_CONSTANCIAS = {
  tituloVarias: 'Anotar constancias',
  tituloUna: 'Constancia de retención',
  explicacion:
    'Las constancias las emite la SAT en Retenciones Web. Aquí solo anota su número y su fecha para llevar el control.',
  fechaParaTodas: 'Misma fecha para todas',
  fechaParaTodasAyuda: 'Al escribirla se copia a todas las filas; después puede cambiar una por una.',
  numero: 'Número de constancia',
  fecha: 'Fecha de la constancia',
  guardar: 'Guardar constancias',
  quitar: 'Quitar constancia',
  quitarTitulo: 'Quitar la constancia',
  quitarMotivo: 'Motivo',
  quitarAyuda: 'Quedará en el historial de cambios. Hasta 300 caracteres.',
} as const;

export const VENTANA_POR_RESOLVER = {
  titulo: 'Retenciones por resolver',
  descripcion:
    'Documentos que se anularon después de retener: hay que deshacer lo hecho en la SAT o confirmar que no hace falta.',
  pendientes: 'Pendientes',
  resueltas: 'Resueltas',
  vacioPendientes: 'No hay retenciones por resolver',
  vacioPendientesAyuda: 'Cuando anule un documento que tenía retención, aparecerá aquí.',
  vacioResueltas: 'Todavía no se ha resuelto ninguna',
  resolver: 'Resolver',
  cambiar: 'Cambiar',
  ventana: 'Resolver la retención',
  resolucion: 'Cómo se resolvió',
  nota: 'Nota',
  notaAyuda: 'Cuente qué hizo, por ejemplo el número de la anulación en la SAT. Hasta 300 caracteres.',
  notaVolver: 'Al volver a «pendiente» la nota se borra.',
  guardar: 'Guardar resolución',
} as const;

export const NOMBRES_DE_RESOLUCIONES: Record<ResolucionDeRetencion, string> = {
  pendiente: 'Volver a pendiente',
  constancia_anulada: 'Anulé la constancia',
  rectificada: 'Rectifiqué el entero',
  no_requiere: 'No hacía falta nada',
};

export const RESOLUCIONES_RESUELTAS: Record<ResolucionDeRetencion, string> = {
  pendiente: 'Pendiente',
  constancia_anulada: 'Constancia anulada',
  rectificada: 'Entero rectificado',
  no_requiere: 'No requería nada',
};

/** Lo que el usuario debe hacer según lo que sugiere el servidor, en palabras llanas. */
export const ACCIONES_SUGERIDAS: Record<AccionSugerida, { titulo: string; detalle: string }> = {
  anular_constancia: {
    titulo: 'Anule la constancia en Retenciones Web de la SAT.',
    detalle: 'Después vuelva aquí y marque «Anulé la constancia».',
  },
  rectificar_entero: {
    titulo: 'Este mes ya se pagó: rectifique el entero en la SAT.',
    detalle: 'Lo pagado de más se corrige con la rectificación. Después marque «Rectifiqué el entero».',
  },
  anular_constancia_y_rectificar: {
    titulo: 'Anule la constancia en Retenciones Web y rectifique el entero del mes en la SAT.',
    detalle: 'Cuando haga ambas cosas, marque la que corresponda y deje la otra en la nota.',
  },
  confirmar: {
    titulo: 'No tiene constancia ni se pagó: no hay nada que deshacer.',
    detalle: 'Confirme con «No hacía falta nada» para sacarla de la lista.',
  },
};

export const VENTANA_DE_ENTEROS = {
  titulo: 'Pagos a la SAT',
  descripcion: 'Lo retenido, lo pagado y el estado de cada mes, por grupo de entero.',
  anio: 'Año',
  mes: 'Mes',
  registrar: 'Registrar pago',
  pagos: 'Pagos',
  sinPagos: 'Todavía no hay pagos en este mes y grupo.',
  sinRetenciones: 'Sin retenciones',
  corregir: 'Corregir',
  anular: 'Anular',
  fechaDePago: 'Fecha de pago',
  documentoDePago: 'Formulario o boleta',
  documentoDePagoAyuda: 'Número del formulario o de la boleta de pago, sin espacios.',
  monto: 'Monto pagado',
  observaciones: 'Observaciones',
  guardar: 'Guardar pago',
  anularTitulo: 'Anular el pago',
  anularMotivo: 'Motivo',
  anularAyuda: 'Quedará en el historial de cambios. Hasta 300 caracteres.',
  variosPagos: 'Puede registrar varios pagos del mismo mes y grupo, por ejemplo uno original y otro complementario.',
} as const;
