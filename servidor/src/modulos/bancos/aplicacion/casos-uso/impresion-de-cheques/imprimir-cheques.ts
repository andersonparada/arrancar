import { randomUUID } from 'node:crypto';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ChequeYaImpreso } from '../../../dominio/errores-de-impresion.js';
import type { VistaDeImpresionDto } from '../../dto/impresion-de-cheque.dto.js';
import { chequeExistente } from '../cheques/dependencias-de-cheques.js';
import { ArmadorDeLaImpresion, type ChequeArmadoParaImprimir } from './armador-de-la-impresion.js';
import type { DependenciasDeImpresionDeCheques } from './dependencias-de-impresion-de-cheques.js';

/**
 * La primera impresión de uno o varios cheques de una misma chequera (hasta 50), todo o nada: marca cada cheque como
 * impreso y guarda su impresión `original` con el formato resuelto que se usó. Responde lo mismo que la vista previa, ya
 * con la marca; el cliente llama `window.print()` después. Un cheque impreso no se blanquea.
 */
export class ImprimirCheques {
  private readonly armador: ArmadorDeLaImpresion;

  constructor(private readonly dependencias: DependenciasDeImpresionDeCheques) {
    this.armador = new ArmadorDeLaImpresion(dependencias);
  }

  /**
   * @throws ChequeYaImpreso si alguno ya se imprimió (use «Reimprimir»).
   * @throws LoteDeChequesInvalido, RecursoNoEncontrado, ChequeNoImprimible o ChequeraSinFormatoDeImpresion.
   * @throws BeneficiarioNoCabe, MontoEnLetrasNoCabe o CampoDelFormatoFaltante si algo no cabe en el formato.
   */
  ejecutar(operador: Operador, ids: readonly string[]): Promise<VistaDeImpresionDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const cheques = await this.armador.cargar(ids);
      for (const cheque of cheques) {
        if (cheque.impresoEn) throw new ChequeYaImpreso(cheque.numero);
      }
      const armados = await this.armador.armar(operador, cheques, {
        esReimpresion: false,
        conCheque: true,
        impreso: true,
      });
      const loteId = armados.length > 1 ? randomUUID() : null;
      for (const armado of armados) await this.registrar(operador, armado, loteId);
      return { cheques: armados.map(({ dto }) => dto), avisos: this.armador.avisosDelLote(cheques), loteId };
    });
  }

  private async registrar(operador: Operador, { datos, formato }: ChequeArmadoParaImprimir, loteId: string | null) {
    const { repositorio, impresiones } = this.dependencias;
    const cheque = await chequeExistente(repositorio, datos.chequeId);
    cheque.marcarImpreso(new Date());
    await repositorio.guardar(cheque);
    await impresiones.agregar({
      empresaId: operador.empresaId,
      chequeId: datos.chequeId,
      movimientoId: datos.movimiento!.id,
      tipo: 'original',
      conCheque: true,
      motivo: null,
      loteId,
      formato,
    });
  }
}
