import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { lineas, type CampoDelServidor } from './campos-del-recurso.js';

const TABLA_DEL_ALCANCE = {
  empresa: { tabla: 'empresas', ruta: '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js' },
  cuenta: { tabla: 'cuentas', ruta: '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js' },
} as const;

const esUnico = ({ campo }: CampoDelServidor) => 'unico' in campo && campo.unico;

/** Sí/no nunca queda vacío; lo demás, solo si es requerido. */
const columna = ({ nombreEnCodigo, requerido, servidor }: CampoDelServidor) =>
  `${nombreEnCodigo}: ${servidor.columna}${requerido ? '.notNull()' : ''},`;

/** Un dato único lo es dentro de la empresa o la cuenta, no en todo el servidor. */
function indicesUnicos(campos: CampoDelServidor[], { plural, alcance }: DefinicionDeRecurso): string {
  return campos
    .filter(esUnico)
    .map(
      (campo) =>
        `unique('${plural.serpiente}_${campo.nombre.serpiente}_unico').on(t.${alcance}Id, t.${campo.nombreEnCodigo}), `,
    )
    .join('');
}

/** Cada llave foránea con su índice: sin él, borrar o buscar por el registro elegido recorre toda la tabla. */
const indicesDeReferencias = (campos: CampoDelServidor[], { plural }: DefinicionDeRecurso) =>
  campos
    .filter(({ campo }) => campo.tipo === 'referencia')
    .map((campo) => `index('${plural.serpiente}_${campo.nombre.serpiente}_idx').on(t.${campo.nombreEnCodigo}), `)
    .join('');

function funcionesPg(campos: CampoDelServidor[]): string {
  const funciones = new Set(['uuid', ...campos.flatMap((campo) => campo.servidor.funcionesPg)]);
  if (campos.some(esUnico)) funciones.add('unique');
  return [...funciones].sort().join(', ');
}

const zodDe = ({ requerido, servidor }: CampoDelServidor) =>
  requerido ? servidor.zodObligatorio : servidor.zodOpcional;

/** Los esquemas comunes que usa el recurso: `textoObligatorio`, `correoOpcional`… (no `z`). */
function importacionesZod(campos: CampoDelServidor[]): string {
  const comunes = [...new Set(campos.map((campo) => /^\w+/.exec(zodDe(campo))![0]).filter((nombre) => nombre !== 'z'))];
  if (comunes.length === 0) return '';
  return `import { ${comunes.sort().join(', ')} } from '../../core/compartido/http/esquemas-comunes.js';\n`;
}

/** Huecos de la tabla de Drizzle y del esquema Zod de la solicitud. */
export function fragmentosDeTablaYHttp(campos: CampoDelServidor[], definicion: DefinicionDeRecurso) {
  const alcance = TABLA_DEL_ALCANCE[definicion.alcance];
  const indices = indicesUnicos(campos, definicion) + indicesDeReferencias(campos, definicion);
  return {
    importacionesPg: funcionesPg(campos),
    importacionTablaDelAlcance: `import { ${alcance.tabla} } from '${alcance.ruta}';`,
    tablaDelAlcance: alcance.tabla,
    columnas: lineas(campos.map(columna), '    '),
    indices,
    // Sin índices propios la tabla no usa sus columnas: el guion bajo lo dice.
    parametroDeIndices: indices ? 't' : '_t',
    importacionesZod: importacionesZod(campos),
    camposZod: lineas(campos.map((campo) => `${campo.nombreEnCodigo}: ${zodDe(campo)},`)),
  };
}
