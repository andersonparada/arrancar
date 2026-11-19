import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import type { Costo } from '../../../dominio/costo.js';
import {
  desdeDelUltimoTramo,
  primerMesAbierto,
  type EstadoDeLosLibros,
} from '../../../dominio/depreciacion/estado-de-los-libros.js';
import { primerMesDelTramo, type PrimerMes } from '../../../dominio/depreciacion/meses.js';
import type { TramoCalculado } from '../../../dominio/depreciacion/tramo.js';
import { tramosDeCambio, type CausaDeCambio } from '../../../dominio/depreciacion/tramos-de-cambio.js';
import { ActivoSinDepreciacionParaMejorar, CambioAnteriorAlUltimoTramo } from '../../../dominio/errores-de-mejora.js';
import { esTerreno, type IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import { baseFiscalDeUso } from '../activos/base-fiscal-de-uso.js';
import type { DependenciasDeCambioDeLibros } from './dependencias-de-mejoras.js';

/** Qué cambia en la depreciación del activo y con qué datos. */
export interface PedidoDeCambioDeLibros {
  /** El activo ya bloqueado y comprobado por quien llama (en uso, del balance). */
  activo: Activo;
  causa: CausaDeCambio;
  /** La fecha de la mejora o del costo posterior; la revisión y el cambio de matrícula no la llevan. */
  fecha: string | null;
  /** Los costos que se agregan (todavía no guardados). */
  costosNuevos: readonly Costo[];
  /** La vida contable que queda, si quien registra la dio. */
  vidaRestanteMeses: number | null;
  /** El residual nuevo en centavos; `null` deja el del activo. */
  valorResidualCentavos: number | null;
}

/** Lo que va a guardarse: los tramos nuevos y el contexto del activo para los eventos y los mensajes. */
export interface CambioPlaneado {
  tramos: TramoCalculado[];
  contable: TramoCalculado | null;
  fiscal: TramoCalculado | null;
  incisoFiscal: IncisoFiscal;
  desdePeriodo: string;
}

async function cargarEstado(dependencias: DependenciasDeCambioDeLibros, activoId: string): Promise<EstadoDeLosLibros> {
  const { tramos, historial, cierres } = dependencias;
  const delHistorial = await historial.deActivo(activoId);
  return {
    tramos: await tramos.vigentesConIdDeActivo(activoId),
    depreciadoPorTramo: delHistorial.depreciadoPorTramo,
    acumuladaCentavos: delHistorial.acumuladaCentavos,
    ultimoMesCerrado: await cierres.ultimoMesCerrado(),
  };
}

/**
 * El primer mes que usa el tramo nuevo (§7.1). La mejora y el costo posterior siguen la regla de la empresa sobre su
 * fecha, nunca antes del primer mes abierto ni antes del último cambio del activo; la revisión y el cambio de matrícula
 * empiezan en el primer mes abierto.
 */
function desdeDelCambio(estado: EstadoDeLosLibros, pedido: PedidoDeCambioDeLibros, regla: PrimerMes): string {
  const abierto = primerMesAbierto(estado);
  if (!abierto) throw new ActivoSinDepreciacionParaMejorar('El activo todavía no tiene depreciación.');
  const ultimo = desdeDelUltimoTramo(estado.tramos) ?? abierto;
  if (pedido.fecha === null) return abierto > ultimo ? abierto : ultimo;
  const deLaFecha = primerMesDelTramo(pedido.fecha, regla);
  const desde = deLaFecha > abierto ? deLaFecha : abierto;
  if (desde < ultimo) throw new CambioAnteriorAlUltimoTramo(ultimo);
  return desde;
}

async function incisoDe(dependencias: DependenciasDeCambioDeLibros, claseId: string): Promise<IncisoFiscal> {
  const clase = await dependencias.clases.buscar(Identificador.desde(claseId));
  if (!clase) throw new RecursoNoEncontrado('La clase de activo');
  return clase.instantanea().incisoFiscal;
}

/** El costo contable (Σ de los costos vigentes y los nuevos) y la base fiscal con el tope del inmueble y el saldo inicial. */
async function cifrasDelCambio(
  dependencias: DependenciasDeCambioDeLibros,
  pedido: PedidoDeCambioDeLibros,
  incisoFiscal: IncisoFiscal,
): Promise<{ costoCentavos: number; baseFiscalCentavos: number }> {
  const propiedades = pedido.activo.instantanea();
  const vigentes = await dependencias.costos.vigentesDeActivo(propiedades.id.valor);
  const costos = [...vigentes, ...pedido.costosNuevos].map((costo) => costo.instantanea());
  const ganado = propiedades.valorComoGanadoComun === null ? 0 : aCentavos(propiedades.valorComoGanadoComun);
  const saldo = await dependencias.saldos.fiscalDeActivo(propiedades.id.valor);
  return {
    costoCentavos: costos.reduce((suma, costo) => suma + costo.montoCentavos, 0),
    baseFiscalCentavos: baseFiscalDeUso({ incisoFiscal, costos, inmueble: propiedades, ganado }, saldo),
  };
}

/**
 * Calcula los tramos de un cambio de depreciación hacia adelante sin guardar nada: junta los costos vigentes y los
 * nuevos, la base fiscal (con el tope del inmueble y el saldo inicial) y la acumulada de cada libro (§7.2 a §7.4).
 * @throws ActivoSinDepreciacionParaMejorar si el activo es un terreno o no tiene tramos.
 * @throws CambioAnteriorAlUltimoTramo, VidaUtilRestanteRequerida según el caso.
 */
export async function planearCambioDeLibros(
  dependencias: DependenciasDeCambioDeLibros,
  operador: Operador,
  pedido: PedidoDeCambioDeLibros,
): Promise<CambioPlaneado> {
  const propiedades = pedido.activo.instantanea();
  const incisoFiscal = await incisoDe(dependencias, propiedades.claseId);
  if (esTerreno(incisoFiscal))
    throw new ActivoSinDepreciacionParaMejorar('Un terreno no se deprecia: no recibe mejoras ni revisiones.');
  const estado = await cargarEstado(dependencias, propiedades.id.valor);
  const desdePeriodo = desdeDelCambio(estado, pedido, await dependencias.primerMes.paraEmpresa(operador));
  const cambio = tramosDeCambio({
    estado,
    causa: pedido.causa,
    desdePeriodo,
    ...(await cifrasDelCambio(dependencias, pedido, incisoFiscal)),
    porcentajeFiscal: propiedades.porcentajeFiscal ?? '0.00',
    valorResidualCentavos: pedido.valorResidualCentavos ?? aCentavos(propiedades.valorResidual ?? '0'),
    vidaRestanteMeses: pedido.vidaRestanteMeses,
  });
  const tramos = [cambio.contable, cambio.fiscal].filter((tramo): tramo is TramoCalculado => tramo !== null);
  return { tramos, contable: cambio.contable, fiscal: cambio.fiscal, incisoFiscal, desdePeriodo };
}
