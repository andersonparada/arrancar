import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_ANTICIPOS, type Anticipo } from '../../../dominio/anticipos.js';
import { AnticipoReabierto } from '../../../dominio/eventos-de-liquidacion.js';
import { fechaDeReabrirElAnticipo } from '../../../dominio/liquidacion-del-anticipo.js';
import { exigirAnticipoLiquidado } from '../../../dominio/reglas-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { DesgloseDelAnticipo } from './desglose-del-anticipo.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';

/** Por qué se reabre y qué hizo Bancos con el depósito o el reembolso (nada si no hubo ninguno). */
export interface DatosDeReabrirElAnticipo {
  motivo: string;
  enBancos: 'sin_inverso' | 'con_inverso' | null;
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

type Dependencias = Pick<
  DependenciasDeAnticipos,
  'anticipos' | 'consultas' | 'movimientos' | 'bancos' | 'documentos' | 'auditoria' | 'reloj'
>;

/**
 * Los pasos de reabrir un anticipo liquidado, vengan de la ventana de aquí o del aviso de Bancos (se anuló el depósito o el
 * reembolso): lo deja `abierto` sin la liquidación, vuelve a fijar el reparto de la entrega, devuelve a pendiente los
 * documentos del libro, audita `reabrir` con el anticipo como estaba y arma el evento que quien llama publica al confirmar.
 */
export class ReabridorDelAnticipo {
  private readonly lector: LectorDelAnticipo;
  private readonly desglose: DesgloseDelAnticipo;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelAnticipo(dependencias);
    this.desglose = new DesgloseDelAnticipo(dependencias);
  }

  /** @throws AnticipoYaAnulado, AnticipoNoLiquidado */
  revisar(anticipo: Anticipo): void {
    exigirAnticipoLiquidado(anticipo);
  }

  async reabrir(operador: Operador, anticipo: Anticipo, datos: DatosDeReabrirElAnticipo): Promise<EventoDominio[]> {
    const { anticipos, auditoria, reloj, consultas } = this.dependencias;
    const anterior = await this.lector.leer(operador, anticipo);
    const fecha = fechaDeReabrirElAnticipo(anticipo.fechaDeLiquidacion!, { ...datos, hoy: await reloj.hoy(operador) });
    const gastos = await consultas.repartoDeLosGastos(anticipo.id);
    await anticipos.reabrir(anticipo.id);
    await auditoria.registrar({
      recurso: RECURSO_DE_ANTICIPOS,
      registroId: anticipo.id,
      accion: 'reabrir',
      anterior,
      motivo: datos.motivo,
    });
    await this.desglose.fijar(operador, (await anticipos.buscar(anticipo.id))!);
    for (const id of gastos.documentosDeCompraIds)
      await this.dependencias.documentos.marcarProcesado(operador, id, false);
    return [this.evento(operador, anticipo, { ...datos, fecha })];
  }

  private evento(
    operador: Operador,
    anticipo: Anticipo,
    datos: { enBancos: DatosDeReabrirElAnticipo['enBancos']; fecha: string },
  ) {
    return new AnticipoReabierto({
      empresaId: operador.empresaId,
      anticipoId: anticipo.id,
      numero: anticipo.numero,
      fecha: datos.fecha,
      fechaDeLiquidacion: anticipo.fechaDeLiquidacion!,
      devueltoCentavos: anticipo.devueltoCentavos,
      reembolsadoCentavos: anticipo.reembolsadoCentavos,
      noLiquidadoCentavos: anticipo.noLiquidadoCentavos,
      destinoDeNoLiquidado: anticipo.destinoDeNoLiquidado,
      anulacionEnBancos: datos.enBancos,
    });
  }
}
