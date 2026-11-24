import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ActivoFichaDto, SolicitudDePonerEnUso } from '../../dto/activo.dto.js';
import { ActivadorDeActivos } from './activar-activos.js';
import type { DependenciasDeUso } from './dependencias-de-uso.js';

interface PedidoDePonerEnUso {
  activoId: string;
  solicitud: SolicitudDePonerEnUso;
}

export class PonerEnUso {
  private readonly activador: ActivadorDeActivos;

  constructor(dependencias: DependenciasDeUso) {
    this.activador = new ActivadorDeActivos(dependencias);
  }

  /**
   * Pone el activo en uso («Disponible para uso»): toma de su clase el porcentaje fiscal, la vida útil y el residual
   * que el usuario no escriba, los valida contra el máximo de ley y abre los dos tramos de depreciación. Con
   * `ubicacion`, lo deja en esa localidad y departamento, y en la bodega de activos si no hay responsable (AFI-3).
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ActivoNoEnConstruccion si no es un activo del balance en construcción.
   * @throws ActivoSinCosto si no tiene costos vigentes (salvo los terrenos).
   * @throws FechaDeUsoInvalida, MesCerrado o ParametrosDeUsoInvalidos si la fecha o los parámetros no cumplen.
   */
  async ejecutar(operador: Operador, { activoId, solicitud }: PedidoDePonerEnUso): Promise<ActivoFichaDto> {
    const [ficha] = await this.activador.ejecutar(operador, {
      activoIds: [activoId],
      fechaDeInicioDeUso: solicitud.fechaDeInicioDeUso,
      solicitudDe: () => solicitud,
      ubicacion: solicitud.ubicacion,
    });
    return ficha!;
  }
}
