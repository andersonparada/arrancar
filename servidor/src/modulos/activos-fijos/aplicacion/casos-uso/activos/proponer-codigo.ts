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

const RONDAS_MAXIMAS = 5;

/**
 * Los siguientes `cantidad` códigos libres en una sola pasada (un bloque de correlativos): ni los usa otro activo ni
 * están en `reservados` (los que ya escribió el usuario en la cuadrícula). Un código usado se salta y se sigue.
 * @throws CodigoNoDisponible si no halla suficientes.
 */
export async function proponerCodigos(
  { correlativos, prefijo, repositorio }: Pick<DependenciasDeActivos, 'correlativos' | 'prefijo' | 'repositorio'>,
  operador: Operador,
  { cantidad, reservados }: { cantidad: number; reservados: ReadonlySet<string> },
): Promise<string[]> {
  const inicio = await prefijo.paraEmpresa(operador);
  const elegidos: string[] = [];
  for (let ronda = 0; ronda < RONDAS_MAXIMAS && elegidos.length < cantidad; ronda++) {
    const candidatos: string[] = [];
    while (candidatos.length < cantidad - elegidos.length) {
      const { numero } = await correlativos.siguiente('activos-fijos.activos', FECHA_DEL_CONTADOR);
      candidatos.push(`${inicio}${String(numero).padStart(DIGITOS, '0')}`);
    }
    const usados = await repositorio.codigosUsados(candidatos);
    elegidos.push(...candidatos.filter((c) => !usados.has(c.toUpperCase()) && !reservados.has(c.toUpperCase())));
  }
  if (elegidos.length < cantidad) throw new CodigoNoDisponible();
  return elegidos;
}
