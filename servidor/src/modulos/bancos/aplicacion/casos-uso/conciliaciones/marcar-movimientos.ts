import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Conciliacion } from '../../../dominio/conciliacion.js';
import { ConciliacionNoEstaEnProceso, MovimientoNoConciliable } from '../../../dominio/errores.js';
import { avisosDeMarcas } from '../../avisos-de-marcas-de-conciliacion.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import {
  documentoDeLaConciliacion,
  conciliacionExistente,
  type DependenciasDeConciliaciones,
} from './dependencias-de-conciliaciones.js';

interface SolicitudDeMarcas {
  conciliacionId: string;
  /** La lista completa de movimientos marcados: reemplaza las marcas anteriores. */
  movimientoIds: string[];
}

/** Guarda las marcas de la conciliación (qué documentos aparecen en el estado de cuenta del banco). */
export class MarcarMovimientos {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * Con un posfechado de la carga inicial marcado por primera vez en la primera conciliación de la cuenta, el documento
   * trae el aviso «cobrado pronto» (no bloquea).
   * @throws ConciliacionNoEstaEnProceso si ya se elaboró o se autorizó.
   * @throws MovimientoNoConciliable si algún id no es un candidato válido (otra cuenta, anulado, fecha
   *   posterior al fin de mes, o marcado en otra conciliación).
   */
  ejecutar(operador: Operador, { conciliacionId, movimientoIds }: SolicitudDeMarcas): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      if (!conciliacion.estaEnProceso) throw new ConciliacionNoEstaEnProceso();
      const marcados = await this.marcadosValidos(conciliacion, movimientoIds);
      const antes = await documentoDeLaConciliacion(operador, this.dependencias, conciliacionId);
      await repositorio.guardarMarcas(conciliacionId, marcados);
      const despues = await documentoDeLaConciliacion(operador, this.dependencias, conciliacionId);
      const avisos = await this.avisos(operador, conciliacion, { antes, despues });
      return avisos.length > 0 ? { ...despues, avisos } : despues;
    });
  }

  /** Los ids pedidos más los pares compensados, que se marcan juntos aunque el usuario no los haya elegido. */
  private async marcadosValidos(conciliacion: Conciliacion, movimientoIds: string[]): Promise<string[]> {
    const { consultas } = this.dependencias;
    const { id, cuentaBancariaId } = conciliacion.instantanea();
    const finDelMes = conciliacion.finDelMes();
    const validos = new Set(await consultas.idsDeCandidatos(cuentaBancariaId, finDelMes, id.valor));
    if (movimientoIds.some((movimientoId) => !validos.has(movimientoId))) throw new MovimientoNoConciliable();
    // Un original y su inverso que nunca pasaron por el banco no son partidas en tránsito.
    const compensados = await consultas.paresCompensadosPendientes(cuentaBancariaId, finDelMes, id.valor);
    return [...new Set([...movimientoIds, ...compensados])];
  }

  private async avisos(
    operador: Operador,
    conciliacion: Conciliacion,
    documentos: Parameters<typeof avisosDeMarcas>[0],
  ) {
    const { cuentaBancariaId, anio, mes } = conciliacion.instantanea();
    const esLaPrimera = !(await this.dependencias.consultas.hayAnteriorA(cuentaBancariaId, { anio, mes }));
    const { fechaDeInicio } = await this.dependencias.cargaInicial.obtener(operador);
    return avisosDeMarcas(documentos, { esLaPrimera, fechaDeInicio });
  }
}
