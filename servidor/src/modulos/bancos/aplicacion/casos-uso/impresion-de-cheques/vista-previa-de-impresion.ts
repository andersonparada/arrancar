import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { VistaDeImpresionDto } from '../../dto/impresion-de-cheque.dto.js';
import { ArmadorDeLaImpresion } from './armador-de-la-impresion.js';
import type { DependenciasDeImpresionDeCheques } from './dependencias-de-impresion-de-cheques.js';

/**
 * La vista previa de uno o varios cheques (`cheques.ver`): lo que se dibujaría en el papel y el comprobante, con sus
 * avisos. No marca nada ni gasta cheques; de un cheque ya impreso sale como copia («REIMPRESIÓN»).
 */
export class VistaPreviaDeImpresion {
  private readonly armador: ArmadorDeLaImpresion;

  constructor(private readonly dependencias: DependenciasDeImpresionDeCheques) {
    this.armador = new ArmadorDeLaImpresion(dependencias);
  }

  /**
   * @throws LoteDeChequesInvalido, RecursoNoEncontrado, ChequeNoImprimible o ChequeraSinFormatoDeImpresion.
   * @throws BeneficiarioNoCabe, MontoEnLetrasNoCabe o CampoDelFormatoFaltante si algo no cabe en el formato.
   */
  ejecutar(operador: Operador, ids: readonly string[]): Promise<VistaDeImpresionDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const cheques = await this.armador.cargar(ids);
      const armados = await Promise.all(
        cheques.map(async (cheque) => {
          const [armado] = await this.armador.armar(operador, [cheque], {
            esReimpresion: cheque.impresoEn !== null,
            conCheque: true,
            impreso: cheque.impresoEn !== null,
          });
          return armado!.dto;
        }),
      );
      return { cheques: armados, avisos: this.armador.avisosDelLote(cheques), loteId: null };
    });
  }
}
