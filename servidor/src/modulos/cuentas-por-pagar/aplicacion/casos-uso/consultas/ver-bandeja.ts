import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BandejaDto } from '../../dto/documento-por-pagar.dto.js';
import { dtoDeDocumentoPorPagar } from '../../dto/dto-de-documento-por-pagar.js';
import { puntoDeVistaDe, type DependenciasDeConsultas } from './dependencias-de-consultas.js';

/** Cuántos documentos pendientes trae la bandeja como máximo; el resto se ve completando los primeros. */
export const LIMITE_DE_LA_BANDEJA = 500;

/** La bandeja de Cuentas por pagar: lo recibido de Libro de compras que falta completar, del más antiguo al más nuevo. */
export class VerBandeja {
  constructor(private readonly dependencias: DependenciasDeConsultas) {}

  ejecutar(operador: Operador): Promise<BandejaDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const vista = await puntoDeVistaDe(reloj, operador);
      const { filas, total } = await consultas.bandeja(LIMITE_DE_LA_BANDEJA);
      return { elementos: filas.map((fila) => dtoDeDocumentoPorPagar(fila, vista)), total };
    });
  }
}
