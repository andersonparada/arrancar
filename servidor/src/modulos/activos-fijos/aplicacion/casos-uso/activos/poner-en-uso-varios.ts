import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { PonerEnUsoVariosInvalido } from '../../../dominio/errores-de-depreciacion.js';
import type { ActivoFichaDto, SolicitudDePonerEnUso, SolicitudDePonerEnUsoVarios } from '../../dto/activo.dto.js';
import { ActivadorDeActivos } from './activar-activos.js';
import type { DependenciasDeUso } from './dependencias-de-uso.js';

/** Tope de activos por operación, igual que al capitalizar. */
export const MAXIMO_DE_ACTIVOS_POR_LOTE = 200;

function exigirLoteValido({ activoIds, ajustes = [] }: SolicitudDePonerEnUsoVarios): void {
  if (activoIds.length === 0) throw new PonerEnUsoVariosInvalido('Elija al menos un activo.');
  if (activoIds.length > MAXIMO_DE_ACTIVOS_POR_LOTE)
    throw new PonerEnUsoVariosInvalido(`Solo se pueden poner ${MAXIMO_DE_ACTIVOS_POR_LOTE} activos por operación.`);
  if (new Set(activoIds).size !== activoIds.length)
    throw new PonerEnUsoVariosInvalido('Un activo no puede aparecer dos veces.');
  if (ajustes.some((ajuste) => !activoIds.includes(ajuste.activoId)))
    throw new PonerEnUsoVariosInvalido('Hay parámetros para un activo que no está en la lista.');
}

export class PonerEnUsoVarios {
  private readonly activador: ActivadorDeActivos;

  constructor(dependencias: DependenciasDeUso) {
    this.activador = new ActivadorDeActivos(dependencias);
  }

  /**
   * Pone «Disponible para uso» varios activos (por ejemplo, los de una alta conjunta) con una fecha y una ubicación
   * comunes; cada uno toma los parámetros de su clase o los suyos en `ajustes`. Todo o nada, en una transacción.
   * @returns las fichas en el orden pedido.
   * @throws PonerEnUsoVariosInvalido si no hay activos, hay más de 200, repetidos o ajustes de otros.
   * @throws RecursoNoEncontrado si algún activo no existe o no es de la empresa.
   * @throws ActivoNoEnConstruccion, ActivoSinCosto, FechaDeUsoInvalida, MesCerrado o ParametrosDeUsoInvalidos si alguno
   * no cumple: ninguno queda en uso.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDePonerEnUsoVarios): Promise<ActivoFichaDto[]> {
    exigirLoteValido(solicitud);
    const { activoIds, fechaDeInicioDeUso, ubicacion, ajustes = [] } = solicitud;
    const solicitudDe = (activoId: string): SolicitudDePonerEnUso => {
      const { porcentajeFiscal, vidaUtilContableMeses, valorResidual } =
        ajustes.find((ajuste) => ajuste.activoId === activoId) ?? {};
      return { fechaDeInicioDeUso, porcentajeFiscal, vidaUtilContableMeses, valorResidual };
    };
    return this.activador.ejecutar(operador, { activoIds, fechaDeInicioDeUso, solicitudDe, ubicacion });
  }
}
