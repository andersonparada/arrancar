import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ChequeraParaPagar, CuentaParaPagar, MediosDePago } from '../../../../core/contratos/bancos.contratos.js';
import { aCentavos } from '../../../dominio/centavos.js';
import type { ChequeraDto } from '../../dto/chequera.dto.js';
import type { CuentaBancariaDto } from '../../dto/cuenta-bancaria.dto.js';
import type { ConsultasChequeras } from '../../puertos/consultas-chequeras.js';
import type { ConsultasCheques } from '../../puertos/consultas-cheques.js';
import type { ConsultasCuentasBancarias } from '../../puertos/consultas-cuentas-bancarias.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';

export interface DependenciasDeMediosDePago {
  unidadDeTrabajo: UnidadDeTrabajo;
  cuentas: ConsultasCuentasBancarias;
  chequeras: ConsultasChequeras;
  cheques: ConsultasCheques;
  movimientos: ConsultasMovimientos;
}

/**
 * La orden `bancos.medios_de_pago`: las cuentas activas con su saldo a la fecha, y de cada una sus chequeras activas
 * con el siguiente cheque disponible. Es lo que otro módulo muestra en su ventana de pago.
 */
export class MediosDePagoDeBancos {
  constructor(private readonly dependencias: DependenciasDeMediosDePago) {}

  ejecutar(operador: Operador, { fecha }: { fecha: string }): Promise<MediosDePago> {
    const { unidadDeTrabajo, cuentas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const activas = (await cuentas.listar()).filter((cuenta) => cuenta.activo);
      return { cuentas: await Promise.all(activas.map((cuenta) => this.cuentaParaPagar(cuenta, fecha))) };
    });
  }

  private async cuentaParaPagar(cuenta: CuentaBancariaDto, fecha: string): Promise<CuentaParaPagar> {
    const { chequeras, movimientos } = this.dependencias;
    const delaCuenta = (await chequeras.listarDeLaCuenta(cuenta.id)).filter((chequera) => chequera.activa);
    return {
      cuentaBancariaId: cuenta.id,
      nombre: cuenta.nombre,
      bancoNombre: cuenta.bancoNombre,
      numero: cuenta.numero,
      saldoCentavos: aCentavos(await movimientos.saldoAlFinDe(cuenta.id, fecha)),
      chequeras: await Promise.all(delaCuenta.map((chequera) => this.chequeraParaPagar(chequera))),
    };
  }

  private async chequeraParaPagar(chequera: ChequeraDto): Promise<ChequeraParaPagar> {
    const siguiente = await this.dependencias.cheques.siguienteDeLaChequera(chequera.id);
    return {
      chequeraId: chequera.id,
      serie: chequera.serie,
      siguienteChequeId: siguiente?.id ?? null,
      siguienteNumero: siguiente?.numero ?? null,
    };
  }
}
