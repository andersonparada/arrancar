import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { Costo } from '../../../dominio/costo.js';
import { claseDeCostoDeLinea } from '../../../dominio/linea-capitalizable.js';
import type { CapitalizacionDto } from '../../dto/capitalizacion.dto.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import { eventoDeCapitalizacion } from './eventos-de-costos.js';
import type { ParteDeCosto, PlanDeCapitalizacion } from './plan-de-capitalizacion.js';

function costoDeLaParte(operador: Operador, parte: ParteDeCosto): Costo {
  return Costo.deLinea({
    empresaId: parte.activo.instantanea().empresaId,
    activoId: parte.activo.id.valor,
    linea: parte.linea,
    claseDeCosto: claseDeCostoDeLinea(parte.linea, parte.asignacion.claseDeCosto),
    montoCentavos: parte.montoCentavos,
    noEsEdificacion: parte.asignacion.noEsEdificacion,
  });
}

/** Lo que dejó la capitalización: la respuesta y los eventos que se publican al confirmar. */
export interface ResultadoDeCapitalizacion {
  dto: CapitalizacionDto;
  eventos: EventoDominio[];
}

/**
 * Guarda el plan ya revisado: primero los activos nuevos (en tandas) y luego sus costos, y arma la respuesta y un evento
 * `activo_capitalizado` por activo.
 */
export async function guardarPlan(
  dependencias: DependenciasDeCostos,
  operador: Operador,
  plan: PlanDeCapitalizacion,
): Promise<ResultadoDeCapitalizacion> {
  const nuevosCostos = plan.partes.map((parte) => costoDeLaParte(operador, parte));
  await dependencias.repositorio.agregarVarios(plan.nuevos);
  await dependencias.costos.agregarVarios(nuevosCostos);
  const hoy = await dependencias.reloj.hoy(operador);
  const activos = [...new Map(plan.partes.map((parte) => [parte.activo.id.valor, parte.activo])).values()];
  const eventos: EventoDominio[] = [];
  const resumen: CapitalizacionDto['activos'] = [];
  for (const activo of activos) {
    const suyos = nuevosCostos.filter((costo) => costo.instantanea().activoId === activo.id.valor);
    const incisoFiscal = await plan.incisoDe(activo.instantanea().claseId);
    eventos.push(eventoDeCapitalizacion({ activo, incisoFiscal }, suyos, hoy));
    const total = suyos.reduce((suma, costo) => suma + costo.instantanea().montoCentavos, 0);
    resumen.push({ id: activo.id.valor, codigo: activo.instantanea().codigo, costo: deCentavos(total) });
  }
  return {
    dto: { activos: resumen, costos: nuevosCostos.length, altaConjuntaIds: plan.altasConjuntas },
    eventos,
  };
}
