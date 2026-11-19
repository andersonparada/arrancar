import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CodigosDeUnidadesRepetidos, CostoInvalido, type RenglonRepetido } from '../../../dominio/errores-de-costo.js';
import type { AsignacionDeLinea } from '../../dto/capitalizacion.dto.js';
import { proponerCodigos } from '../activos/proponer-codigo.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';

/** La llave de un renglón: la asignación y la unidad dentro de ella. */
export const llaveDeUnidad = (asignacion: number, renglon: number): string => `${asignacion}:${renglon}`;

interface CodigoEscrito {
  asignacion: number;
  renglon: number;
  codigo: string;
}

/** Los códigos que el usuario escribió en las cuadrículas de todas las asignaciones, recortados. */
function codigosEscritos(asignaciones: readonly AsignacionDeLinea[]): CodigoEscrito[] {
  return asignaciones.flatMap((asignacion, indice) => {
    const nuevo = asignacion.activoNuevo;
    if (!nuevo) return [];
    if (nuevo.detalleDeUnidades.length > nuevo.unidades)
      throw new CostoInvalido('La cuadrícula tiene más renglones que unidades.');
    return nuevo.detalleDeUnidades.flatMap(({ codigo }, renglon) =>
      codigo?.trim() ? [{ asignacion: indice, renglon, codigo: codigo.trim() }] : [],
    );
  });
}

function repetidosEnLaCuadricula(escritos: readonly CodigoEscrito[]): RenglonRepetido[] {
  const cuenta = new Map<string, number>();
  for (const { codigo } of escritos) cuenta.set(codigo.toUpperCase(), (cuenta.get(codigo.toUpperCase()) ?? 0) + 1);
  return escritos
    .filter(({ codigo }) => (cuenta.get(codigo.toUpperCase()) ?? 0) > 1)
    .map((escrito) => ({ ...escrito, causa: 'repetido_en_la_cuadricula' as const }));
}

/**
 * Revisa juntos, antes de insertar nada, los códigos escritos: ni repetidos entre sí ni usados por otro activo.
 * @throws CodigosDeUnidadesRepetidos con el renglón de cada código malo.
 */
async function revisarCodigos(dependencias: DependenciasDeCostos, escritos: readonly CodigoEscrito[]): Promise<void> {
  const usados = await dependencias.repositorio.codigosUsados(escritos.map(({ codigo }) => codigo));
  const yaUsados = escritos
    .filter(({ codigo }) => usados.has(codigo.toUpperCase()))
    .map((escrito) => ({ ...escrito, causa: 'ya_usado_por_otro_activo' as const }));
  const problemas = [...repetidosEnLaCuadricula(escritos), ...yaUsados];
  if (problemas.length > 0) throw new CodigosDeUnidadesRepetidos(problemas);
}

/**
 * El código de cada unidad de todas las asignaciones: el escrito en la cuadrícula o, si falta, uno propuesto por el
 * correlativo, todos pedidos en un solo bloque. Devuelve `llaveDeUnidad(asignación, renglón)` → código.
 */
export async function codigosDeLasUnidades(
  dependencias: DependenciasDeCostos,
  operador: Operador,
  asignaciones: readonly AsignacionDeLinea[],
): Promise<Map<string, string>> {
  const escritos = codigosEscritos(asignaciones);
  await revisarCodigos(dependencias, escritos);
  const codigos = new Map(escritos.map((e) => [llaveDeUnidad(e.asignacion, e.renglon), e.codigo]));
  const faltantes = asignaciones
    .flatMap((asignacion, indice) =>
      Array.from({ length: asignacion.activoNuevo?.unidades ?? 0 }, (_, renglon) => llaveDeUnidad(indice, renglon)),
    )
    .filter((llave) => !codigos.has(llave));
  const reservados = new Set(escritos.map(({ codigo }) => codigo.toUpperCase()));
  const propuestos = await proponerCodigos(dependencias, operador, { cantidad: faltantes.length, reservados });
  faltantes.forEach((llave, posicion) => codigos.set(llave, propuestos[posicion]!));
  return codigos;
}
