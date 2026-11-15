import type { DocumentoDelLibro } from './documento-del-libro.js';
import { operacionesDelSat2237, type OperacionDelSegmento9 } from './operaciones-del-sat-2237.js';
import { proveedoresDelSat2237, type DetalleDeProveedores } from './proveedores-del-sat-2237.js';
import { rubrosDelSat2237, type RubroDelSat2237 } from './rubros-del-sat-2237.js';
import { vistaDelFormularioSat2237, type VistaDelFormularioSat2237 } from './vista-del-formulario-sat-2237.js';

export interface DatosDelSat2237 {
  rubros: RubroDelSat2237[];
  segmento9: OperacionDelSegmento9[];
  proveedores: DetalleDeProveedores;
  facturasEspeciales: DetalleDeProveedores;
  formulario: VistaDelFormularioSat2237;
  avisos: string[];
}

const AVISOS_FIJOS = [
  'Medicamentos y vehículos tienen casillas propias en el SAT-2237: Arrancar no los separa; revise sus compras.',
  'Importaciones: sin DUCA en Arrancar.',
  'Si exporta o tiene ventas exentas, separe la vinculación con su contador (prorrata, pendiente): todo se reporta como compras locales.',
];

/** Los rubros con crédito fiscal de la sección 5: un neto negativo (notas de crédito sobre compras de meses anteriores) no se puede declarar tal cual. */
const RUBROS_CON_CREDITO = ['combustibles', 'activos_fijos', 'servicios', 'otras_compras'];

const AVISO_DE_NETO_NEGATIVO =
  'El neto de una casilla del crédito fiscal es negativo por notas de crédito sobre compras de meses anteriores: Declaraguate no admite negativos; consulte con su contador cómo declararlo.';

function avisosVariables(rubros: RubroDelSat2237[], proveedores: DetalleDeProveedores[]): string[] {
  const avisos: string[] = [];
  if (rubros.some((r) => r.clave === 'combustibles_exentos' && r.neto.base !== 0)) {
    avisos.push('Hay combustibles exentos de IVA e IDP por el Decreto 22-2026: no dan crédito fiscal.');
  }
  if (rubros.some((r) => RUBROS_CON_CREDITO.includes(r.clave) && (r.neto.base < 0 || r.neto.iva < 0))) {
    avisos.push(AVISO_DE_NETO_NEGATIVO);
  }
  const conAviso = proveedores.flatMap((detalle) => detalle.filas).filter((fila) => fila.aviso !== null).length;
  if (conAviso > 0) avisos.push(`${conAviso} proveedor(es) quedan con neto cero o negativo: revise sus notas.`);
  return avisos;
}

/** Arma los datos para el SAT-2237 con los documentos del libro del período (régimen general). Función pura. */
export function datosDelSat2237(documentos: DocumentoDelLibro[]): DatosDelSat2237 {
  const rubros = rubrosDelSat2237(documentos);
  const { proveedores, facturasEspeciales } = proveedoresDelSat2237(documentos);
  const segmento9 = operacionesDelSat2237(documentos);
  return {
    rubros,
    segmento9,
    proveedores,
    facturasEspeciales,
    formulario: vistaDelFormularioSat2237({ rubros, segmento9, proveedores }),
    avisos: [...AVISOS_FIJOS, ...avisosVariables(rubros, [proveedores, facturasEspeciales])],
  };
}
