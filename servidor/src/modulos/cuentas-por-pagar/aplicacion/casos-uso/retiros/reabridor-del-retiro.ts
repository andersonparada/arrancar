import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { fechaDeAnulacionDelPago, type AnulacionEnBancos } from '../../../dominio/anulacion-de-pagos.js';
import { RetiroReabierto } from '../../../dominio/eventos-de-retiros.js';
import { exigirRetiroLiquidado } from '../../../dominio/reglas-del-retiro.js';
import { RECURSO_DE_RETIROS, type RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { DesgloseDelRetiro } from './desglose-del-retiro.js';
import { LectorDelRetiro } from './lector-del-retiro.js';

/** Por qué se reabre y qué hizo Bancos con el depósito de la devolución (nada si no hubo). */
export interface DatosDeReabrirElRetiro {
  motivo: string;
  enBancos: AnulacionEnBancos;
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

type Dependencias = Pick<
  DependenciasDeRetiros,
  'retiros' | 'consultas' | 'movimientos' | 'bancos' | 'auditoria' | 'reloj'
>;

/**
 * Los pasos de reabrir un retiro liquidado, vengan de la ventana de aquí o del aviso de Bancos (se anuló el depósito de la
 * devolución): lo deja `abierto` sin la liquidación, vuelve a fijar el reparto por concepto del cheque o la nota, audita
 * `reabrir` con el retiro como estaba y arma el evento que quien llama publica al confirmar.
 */
export class ReabridorDelRetiro {
  private readonly lector: LectorDelRetiro;
  private readonly desglose: DesgloseDelRetiro;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelRetiro(dependencias);
    this.desglose = new DesgloseDelRetiro(dependencias);
  }

  /** @throws RetiroYaAnulado, RetiroNoLiquidado */
  revisar(retiro: RetiroDeEfectivo): void {
    exigirRetiroLiquidado(retiro);
  }

  async reabrir(operador: Operador, retiro: RetiroDeEfectivo, datos: DatosDeReabrirElRetiro): Promise<EventoDominio[]> {
    const { retiros, auditoria, reloj } = this.dependencias;
    const anterior = await this.lector.leer(operador, retiro);
    const fechaDeLiquidacion = retiro.fechaDeLiquidacion!;
    const hoy = await reloj.hoy(operador);
    const fecha = fechaDeAnulacionDelPago({ fecha: fechaDeLiquidacion }, { ...datos, hoy });
    await retiros.reabrir(retiro.id);
    await auditoria.registrar({
      recurso: RECURSO_DE_RETIROS,
      registroId: retiro.id,
      accion: 'reabrir',
      anterior,
      motivo: datos.motivo,
    });
    await this.desglose.fijar(operador, (await retiros.buscar(retiro.id))!);
    return [this.evento(operador, retiro, { ...datos, fecha })];
  }

  private evento(operador: Operador, retiro: RetiroDeEfectivo, datos: { enBancos: AnulacionEnBancos; fecha: string }) {
    return new RetiroReabierto({
      empresaId: operador.empresaId,
      retiroId: retiro.id,
      numero: retiro.numero,
      fecha: datos.fecha,
      fechaDeLiquidacion: retiro.fechaDeLiquidacion!,
      devueltoCentavos: retiro.devueltoCentavos,
      faltanteCentavos: retiro.faltanteCentavos,
      anulacionEnBancos: datos.enBancos,
    });
  }
}
