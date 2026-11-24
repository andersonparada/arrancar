import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { DivisionConMovimientosPosteriores, DivisionInvalida } from '../../../dominio/errores-de-division.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import { exigirCantidadASeparar, exigirDivisible } from '../../../dominio/reglas-de-division.js';
import type { DependenciasDeDivisiones } from './dependencias-de-divisiones.js';

/** El activo, ya bloqueado, con el inciso fiscal de su clase. */
export interface PedidoDeComprobacion {
  activo: Activo;
  fecha: string;
  cantidad: number;
}

/** La fecha no es futura ni anterior al uso (o a la adquisición) y cae en un mes abierto. */
async function exigirFechaValida(
  dependencias: DependenciasDeDivisiones,
  operador: Operador,
  { activo, fecha }: PedidoDeComprobacion,
): Promise<void> {
  const { reloj, cierres } = dependencias;
  if (fecha > (await reloj.hoy(operador))) throw new DivisionInvalida('La fecha no puede ser futura.');
  const { fechaDeInicioDeUso, fechaDeAdquisicion } = activo.instantanea();
  if (fecha < (fechaDeInicioDeUso ?? fechaDeAdquisicion))
    throw new DivisionInvalida('La fecha no puede ser anterior al inicio de uso ni a la adquisición del activo.');
  const ultimo = await cierres.ultimoMesCerrado();
  if (ultimo && periodoDe(fecha) <= periodoDe(ultimo)) throw new MesCerrado(periodoDe(fecha));
}

/** Ni un traslado, ni una mejora ni otra división del activo tiene fecha posterior a la de la división (§6.11). */
async function exigirSinMovimientosPosteriores(
  dependencias: DependenciasDeDivisiones,
  { activo, fecha }: PedidoDeComprobacion,
): Promise<void> {
  const id = activo.id.valor;
  const { traslados, consultasDeMejoras, consultasDeDivisiones } = dependencias;
  const [reciente] = await traslados.recientesDeActivo(id, 1);
  if (reciente && reciente.fecha > fecha)
    throw new DivisionConMovimientosPosteriores(
      `El activo tiene un traslado del ${reciente.fecha}: la fecha no puede ser anterior.`,
    );
  const posterior = (await consultasDeMejoras.deActivo(id)).find((m) => m.estado === 'vigente' && m.fecha > fecha);
  if (posterior)
    throw new DivisionConMovimientosPosteriores(
      `El activo tiene una mejora del ${posterior.fecha}: la fecha no puede ser anterior.`,
    );
  const ultima = await consultasDeDivisiones.fechaDeLaUltimaDeActivo(id);
  if (ultima && ultima > fecha)
    throw new DivisionConMovimientosPosteriores(
      `El activo tiene una división del ${ultima}: la fecha no puede ser anterior.`,
    );
}

/**
 * Revisa que el activo pueda dividirse en esa fecha y con esa cantidad: divisible, cantidad entre 1 y menos que la suya,
 * fecha válida en un mes abierto y sin movimientos posteriores. Devuelve el inciso fiscal de su clase.
 * @throws DivisionNoPermitida, CantidadASepararInvalida, DivisionInvalida, MesCerrado, DivisionConMovimientosPosteriores.
 * @throws RecursoNoEncontrado si la clase del activo no existe.
 */
export async function exigirDivisionPosible(
  dependencias: DependenciasDeDivisiones,
  operador: Operador,
  pedido: PedidoDeComprobacion,
): Promise<IncisoFiscal> {
  const propiedades = pedido.activo.instantanea();
  const clase = await dependencias.clases.buscar(Identificador.desde(propiedades.claseId));
  if (!clase) throw new RecursoNoEncontrado('La clase');
  const incisoFiscal = clase.instantanea().incisoFiscal;
  const tieneComponentes = await dependencias.repositorio.tieneComponentes(pedido.activo.id);
  exigirDivisible(propiedades, { incisoFiscal, tieneComponentes });
  exigirCantidadASeparar(propiedades.cantidad, pedido.cantidad);
  await exigirFechaValida(dependencias, operador, pedido);
  await exigirSinMovimientosPosteriores(dependencias, pedido);
  return incisoFiscal;
}
