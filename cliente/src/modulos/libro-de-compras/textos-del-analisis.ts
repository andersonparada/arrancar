import type { ClaveDeAnalisis } from './servicios/analisis.api';

export const VENTANA_DEL_ANALISIS = {
  titulo: 'Análisis de compras',
  descripcion:
    'Las compras de uno o varios meses vistas por proveedor, concepto, IVA al costo, activos y combustibles.',
  desde: 'Desde',
  hasta: 'Hasta',
  exportar: 'Exportar a Excel',
  imprimir: 'Imprimir',
  incluirFuera: 'Incluir documentos fuera del libro',
  incluirFueraAyuda: 'Suma también recibos y facturas que no se reportan a la SAT.',
  cargando: 'Cargando…',
  vacio: 'No hay compras en este rango',
  vacioAyuda: 'Registre las facturas en Documentos de compra o escoja otros meses.',
  tipoBien: 'Bien',
  tipoServicio: 'Servicio',
  sinCombustible: 'Sin combustible (IDP según la factura)',
  sinMotivo: 'Sin motivo',
  decreto: 'Exento Decreto 22-2026',
  decretoAyuda: 'Combustible con IVA exento por el Decreto 22-2026 en este mes.',
  total: 'Total',
  subtotal: 'Subtotal',
} as const;

/** Nombre de cada pestaña y lo que responde, en el orden en que se muestran. */
export const ANALISIS_DISPONIBLES: Array<{ clave: ClaveDeAnalisis; titulo: string; ayuda: string }> = [
  {
    clave: 'compras-por-proveedor',
    titulo: 'Por proveedor',
    ayuda: 'Cuánto se compró a cada proveedor, con el IVA, las retenciones y lo que se le paga.',
  },
  {
    clave: 'compras-por-concepto',
    titulo: 'Por concepto',
    ayuda: 'En qué se gastó: cada concepto con su base, su IVA y su costo real.',
  },
  {
    clave: 'iva-al-costo',
    titulo: 'IVA al costo',
    ayuda: 'El IVA que no se pudo tomar como crédito fiscal y se sumó al costo o gasto, por motivo.',
  },
  {
    clave: 'activos-fijos',
    titulo: 'Activos fijos',
    ayuda: 'Lo comprado que se marcó como activo fijo, para el control de la depreciación.',
  },
  {
    clave: 'combustibles',
    titulo: 'Combustibles e IDP',
    ayuda: 'Galones, IDP y base de combustibles mes a mes, con los meses de IVA exento marcados.',
  },
];

export const PROBLEMAS_DEL_RANGO = {
  alReves: 'El mes «Hasta» no puede ser anterior al mes «Desde». Cambie uno de los dos.',
  muyLargo: 'El análisis abarca hasta 24 meses. Acorte el rango para verlo.',
} as const;
