import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { OrdenesEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { deCentavos } from '../../../dominio/centavos.js';
import { ChequeNoDisponible } from '../../../dominio/errores.js';
import type { ConsultasCheques } from '../../puertos/consultas-cheques.js';
import type { EmitirCheque } from '../cheques/emitir-cheque.js';

type Orden = OrdenesEntreModulos['bancos.emitir_cheque_de_origen'];

export interface DependenciasDeEmitirChequeDeOrigen {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasCheques;
  emitir: EmitirCheque;
}

/**
 * La orden `bancos.emitir_cheque_de_origen`: emite el cheque indicado (o el siguiente disponible) de la chequera con
 * el mismo caso de uso que la pantalla de Bancos, pero con el origen y los conceptos que manda el otro módulo. Un
 * posfechado sin fondos vuelve como aviso, sin bloquear.
 */
export class EmitirChequeDeOrigen {
  constructor(private readonly dependencias: DependenciasDeEmitirChequeDeOrigen) {}

  /** @throws ChequeNoDisponible si la chequera no tiene el cheque pedido o ya no le quedan disponibles. */
  ejecutar(operador: Operador, datos: Orden['datos']): Promise<Orden['respuesta']> {
    const { unidadDeTrabajo, emitir } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const chequeId = await this.chequeAEmitir(datos);
      const emitido = await emitir.ejecutar(operador, {
        chequeId,
        fecha: datos.fecha,
        monto: deCentavos(datos.montoCentavos),
        beneficiario: datos.beneficiario,
        noNegociable: datos.noNegociable,
        paraAbonoEnCuenta: datos.paraAbonoEnCuenta ?? false,
        referencia: datos.referencia ?? null,
        observaciones: datos.observaciones ?? null,
        origen: datos.origen,
        conceptos: datos.conceptos,
      });
      return {
        movimientoId: emitido.id,
        chequeId,
        numeroDeCheque: emitido.numeroDeCheque as number,
        cuentaBancariaId: emitido.cuentaBancariaId,
        avisos: emitido.avisos,
      };
    });
  }

  private async chequeAEmitir({ chequeraId, chequeId }: Orden['datos']): Promise<string> {
    const { consultas } = this.dependencias;
    const cheque = chequeId ? await consultas.obtener(chequeId) : await consultas.siguienteDeLaChequera(chequeraId);
    if (!cheque || cheque.chequeraId !== chequeraId || cheque.estado !== 'disponible') throw new ChequeNoDisponible();
    return cheque.id;
  }
}
