import type { DocumentoDelLibro } from './documento-del-libro.js';
import { casillasDelSat2237, type CasillasDelSat2237 } from './casillas-del-sat-2237.js';
import { operacionesDelSat2237, type OperacionDelSegmento9 } from './operaciones-del-sat-2237.js';
import { proveedoresDelSat2237, type DetalleDeProveedores } from './proveedores-del-sat-2237.js';
import { rubrosDelSat2237, type RubroDelSat2237 } from './rubros-del-sat-2237.js';

export interface DatosDelSat2237 {
  rubros: RubroDelSat2237[];
  segmento9: OperacionDelSegmento9[];
  proveedores: DetalleDeProveedores;
  facturasEspeciales: DetalleDeProveedores;
  casillas: CasillasDelSat2237 | null;
  avisos: string[];
}

const AVISOS_FIJOS = [
  'Medicamentos y vehículos tienen casillas propias en el SAT-2237: Arrancar no los separa; revise sus compras.',
  'Importaciones: sin DUCA en Arrancar.',
  'Si exporta o tiene ventas exentas, separe la vinculación con su contador (prorrata, pendiente): todo se reporta como compras locales.',
];

function avisosVariables(rubros: RubroDelSat2237[], proveedores: DetalleDeProveedores[]): string[] {
  const avisos: string[] = [];
  if (rubros.some((r) => r.clave === 'combustibles_exentos' && r.neto.base !== 0)) {
    avisos.push('Hay combustibles exentos de IVA e IDP por el Decreto 22-2026: no dan crédito fiscal.');
  }
  const conAviso = proveedores.flatMap((detalle) => detalle.filas).filter((fila) => fila.aviso !== null).length;
  if (conAviso > 0) avisos.push(`${conAviso} proveedor(es) quedan con neto cero o negativo: revise sus notas.`);
  return avisos;
}

/** Arma los datos para el SAT-2237 con los documentos del libro del período (régimen general). Función pura. */
export function datosDelSat2237(documentos: DocumentoDelLibro[]): DatosDelSat2237 {
  const rubros = rubrosDelSat2237(documentos);
  const { proveedores, facturasEspeciales } = proveedoresDelSat2237(documentos);
  return {
    rubros,
    segmento9: operacionesDelSat2237(documentos),
    proveedores,
    facturasEspeciales,
    casillas: casillasDelSat2237(rubros),
    avisos: [...AVISOS_FIJOS, ...avisosVariables(rubros, [proveedores, facturasEspeciales])],
  };
}
