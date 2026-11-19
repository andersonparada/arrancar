import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DependenciasDeActivos } from './dependencias-de-activos.js';

const INTENTOS_MAXIMOS = 50;
const DIGITOS = 4;

/**
 * El siguiente código libre: el prefijo de la empresa y el correlativo (`AF-0001`). Si alguien ya escribió a mano un
 * código con ese número, salta al siguiente.
 */
export async function proponerCodigo(
  { correlativos, prefijo, repositorio }: Pick<DependenciasDeActivos, 'correlativos' | 'prefijo' | 'repositorio'>,
  operador: Operador,
  fecha: string,
): Promise<string> {
  const inicio = await prefijo.paraEmpresa(operador);
  for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
    const { numero } = await correlativos.siguiente('activos-fijos.activos', fecha);
    const codigo = `${inicio}${String(numero).padStart(DIGITOS, '0')}`;
    if (!(await repositorio.existeCodigo(codigo))) return codigo;
  }
  throw new Error('No se encontró un código libre para el activo.');
}
