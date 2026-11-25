import type { ClaveDeSistemaDeIngreso, DatosDeConceptoDeIngreso } from './concepto-de-ingreso.js';

/** Un concepto sugerido; los de sistema llevan su clave. */
export interface ConceptoDeIngresoSugerido {
  datos: DatosDeConceptoDeIngreso;
  claveDeSistema: ClaveDeSistemaDeIngreso | null;
}

const sugerido = (
  nombre: string,
  tipo: 'bien' | 'servicio',
  claveDeSistema: ClaveDeSistemaDeIngreso | null = null,
): ConceptoDeIngresoSugerido => ({ datos: { nombre, tipo, activo: true }, claveDeSistema });

/**
 * La lista sugerida (`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §5.1), sin rubro: «Venta de ganado» o
 * «Venta de cosecha» las agrega cada empresa. Se siembra al abrir el catálogo vacío.
 */
export const CONCEPTOS_DE_INGRESO_SUGERIDOS: readonly ConceptoDeIngresoSugerido[] = [
  sugerido('Venta de bienes', 'bien'),
  sugerido('Prestación de servicios', 'servicio'),
  sugerido('Venta de activo fijo', 'bien', 'venta_de_activo_fijo'),
  sugerido('Otros ingresos', 'servicio'),
];
