import type { DatosDeConceptoDeGasto } from './concepto-de-gasto.js';

/**
 * La lista sugerida de conceptos de gasto: un punto de partida general, útil a cualquier empresa,
 * que cada una edita, inactiva o amplía. Ninguno es producto agropecuario y los activos fijos son
 * siempre «bien». Se siembra al abrir el catálogo vacío, como los conceptos de Bancos (H3).
 */
export const CONCEPTOS_DE_GASTO_SUGERIDOS: readonly DatosDeConceptoDeGasto[] = [
  {
    nombre: 'Combustibles',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Reparaciones y mantenimiento',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Servicios profesionales',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Energía eléctrica',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Agua',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Teléfono e internet',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Alquileres',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Papelería y útiles',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Fletes y transporte',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Publicidad',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Seguros',
    tipoPorOmision: 'servicio',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Materiales y suministros',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Maquinaria y equipo',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: true,
    activo: true,
  },
  {
    nombre: 'Vehículos',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: true,
    activo: true,
  },
  {
    nombre: 'Mobiliario y equipo de oficina',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: true,
    activo: true,
  },
  {
    nombre: 'Equipo de cómputo',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: true,
    activo: true,
  },
];
