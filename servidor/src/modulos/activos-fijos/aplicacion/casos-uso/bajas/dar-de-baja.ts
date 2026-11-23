import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { BajaInvalida } from '../../../dominio/errores-de-baja.js';
import type { BajaDto, SolicitudDeBaja } from '../../dto/baja.dto.js';
import type { RegistradorDeBajas } from './registrador-de-bajas.js';

/** Da de baja un activo con todos sus componentes vigentes, por cualquier causa menos la venta. */
export class DarDeBaja {
  constructor(private readonly registrador: RegistradorDeBajas) {}

  /**
   * Congela el costo, la acumulada contable y fiscal y el valor en libros al día de la baja, numera el acta y deja el
   * activo y sus componentes dados de baja. Devuelve la baja con sus avisos (sin acta, sin denuncia, IVA de la donación).
   * @throws BajaInvalida si la causa es la venta (es de `RegistrarVenta`) o un dato no vale.
   * @throws RecursoNoEncontrado, ActivoNoEnUso, ActivoDadoDeBaja, MesCerrado, FechaDeBajaAnteriorAlUso,
   * FechaAnteriorAlUltimoTraslado, CausaDeBajaNoPermitida, BajaParcialNoDisponible según el caso.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeBaja): Promise<BajaDto> {
    if (solicitud.causa === 'venta') throw new BajaInvalida('Una venta se registra con sus datos de venta.');
    const baja = await this.registrador.ejecutar(operador, { ...solicitud, venta: null });
    return baja;
  }
}
