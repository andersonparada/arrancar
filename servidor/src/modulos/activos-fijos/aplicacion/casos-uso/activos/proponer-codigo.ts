import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CodigoNoDisponible } from '../../../dominio/errores-de-activo.js';
import type { DependenciasDeActivos } from './dependencias-de-activos.js';

const INTENTOS_MAXIMOS = 50;
const DIGITOS = 4;
/** El código no lleva año y es único en la empresa: el contador siempre es el mismo, sin importar el reinicio anual. */
const FECHA_DEL_CONTADOR = '2000-01-01';

/**
 * El siguiente código libre: el prefijo de la empresa y el correlativo (`AF-0001`). Si alguien ya escribió a mano un
 * código con ese número, salta al siguiente.
 * @throws CodigoNoDisponible si no halla uno libre.
 */
export async function proponerCodigo(
  { correlativos, prefijo, repositorio }: Pick<DependenciasDeActivos, 'correlativos' | 'prefijo' | 'repositorio'>,
  operador: Operador,
): Promise<string> {
  const inicio = await prefijo.paraEmpresa(operador);
  for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
    const { numero } = await correlativos.siguiente('activos-fijos.activos', FECHA_DEL_CONTADOR);
    const codigo = `${inicio}${String(numero).padStart(DIGITOS, '0')}`;
    if (!(await repositorio.existeCodigo(codigo))) return codigo;
  }
  throw new CodigoNoDisponible();
}
