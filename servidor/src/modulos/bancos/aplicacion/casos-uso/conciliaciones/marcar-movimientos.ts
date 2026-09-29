import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ConciliacionNoEstaEnProceso, MovimientoNoConciliable } from '../../../dominio/errores.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

interface SolicitudDeMarcas {
  conciliacionId: string;
  /** La lista completa de movimientos marcados: reemplaza las marcas anteriores. */
  movimientoIds: string[];
}

/** Guarda las marcas de la conciliación (qué documentos aparecen en el estado de cuenta del banco). */
export class MarcarMovimientos {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionNoEstaEnProceso si ya se elaboró o se autorizó.
   * @throws MovimientoNoConciliable si algún id no es un candidato válido (otra cuenta, anulado, fecha
   *   posterior al fin de mes, o marcado en otra conciliación).
   */
  ejecutar(operador: Operador, { conciliacionId, movimientoIds }: SolicitudDeMarcas): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      if (!conciliacion.estaEnProceso) throw new ConciliacionNoEstaEnProceso();

      const { cuentaBancariaId } = conciliacion.instantanea();
      const finDelMes = conciliacion.finDelMes();
      const idsValidos = await consultas.idsDeCandidatos(cuentaBancariaId, finDelMes, conciliacionId);
      const validos = new Set(idsValidos);
      if (movimientoIds.some((id) => !validos.has(id))) throw new MovimientoNoConciliable();

      // Un original y su inverso que nunca pasaron por el banco se marcan juntos, compensados:
      // no son partidas en tránsito, aunque el usuario no los haya elegido a mano.
      const compensados = await consultas.paresCompensadosPendientes(cuentaBancariaId, finDelMes, conciliacionId);
      const marcados = [...new Set([...movimientoIds, ...compensados])];

      await repositorio.guardarMarcas(conciliacionId, marcados);
      return consultas.obtener(conciliacionId);
    });
  }
}
