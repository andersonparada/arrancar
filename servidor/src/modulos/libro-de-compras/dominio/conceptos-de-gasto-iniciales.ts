import type { DatosDeConceptoDeGasto } from './concepto-de-gasto.js';

/**
 * La lista sugerida de conceptos de gasto (respuesta 11 del usuario): un punto de partida que cada
 * empresa edita, inactiva o amplía. Se siembra al abrir el catálogo vacío, como los conceptos de
 * Bancos (H3).
 */
export const CONCEPTOS_DE_GASTO_SUGERIDOS: readonly DatosDeConceptoDeGasto[] = [
  { nombre: 'Combustibles', tipoPorOmision: 'bien', esProductoAgropecuario: false, esActivoFijo: false, activo: true },
  {
    nombre: 'Insumos agrícolas',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: true,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Alimento para ganado',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: true,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Medicinas veterinarias',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: true,
    esActivoFijo: false,
    activo: true,
  },
  {
    nombre: 'Reparaciones',
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
    nombre: 'Maquinaria y equipo',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: true,
    activo: true,
  },
];
