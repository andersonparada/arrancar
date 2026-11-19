import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_ANTICIPOS, type Anticipo } from '../../../dominio/anticipos.js';
import { AnticipoAnulado } from '../../../dominio/eventos-de-anticipos.js';
import { exigirAnticipoAnulable, fechaDeAnulacionDelAnticipo } from '../../../dominio/reglas-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';

/** Lo que hizo Bancos con el cheque o la nota del anticipo, para fechar la anulación. */
export interface DatosDeAnularElAnticipo {
  motivo: string;
  enBancos: 'sin_inverso' | 'con_inverso';
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

interface DatosDelEvento {
  fecha: string;
  enBancos: 'sin_inverso' | 'con_inverso';
}

type Dependencias = Pick<DependenciasDeAnticipos, 'anticipos' | 'consultas' | 'movimientos' | 'auditoria' | 'reloj'>;

/**
 * Anular un anticipo, venga de la ventana de aquí o del aviso de Bancos: revisa que se pueda (abierto, sin gastos vigentes,
 * cheque sin cobrar), lo deja `anulado` con su fecha contable, lo audita como estaba y arma el evento que quien llama
 * publica al confirmar.
 */
export class AnuladorDelAnticipo {
  private readonly lector: LectorDelAnticipo;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelAnticipo(dependencias);
  }

  /** @throws AnticipoYaAnulado, AnticipoLiquidado, AnticipoConGastos, AnticipoCobrado */
  async revisar(anticipo: Anticipo): Promise<void> {
    const { consultas, movimientos } = this.dependencias;
    exigirAnticipoAnulable(anticipo, {
      gastosVigentes: (await consultas.gastadoDe(anticipo.id)).cantidad,
      conciliado: anticipo.estado === 'abierto' && (await movimientos.estaConciliado(anticipo.movimientoId)),
    });
  }

  async anular(operador: Operador, anticipo: Anticipo, datos: DatosDeAnularElAnticipo): Promise<EventoDominio[]> {
    const { anticipos, auditoria, reloj } = this.dependencias;
    const anterior = await this.lector.leer(operador, anticipo);
    const fecha = fechaDeAnulacionDelAnticipo(anticipo, { ...datos, hoy: await reloj.hoy(operador) });
    await anticipos.anular(anticipo.id, {
      anuladoPor: operador.usuarioId,
      motivo: datos.motivo,
      fechaDeAnulacion: fecha,
    });
    await auditoria.registrar({
      recurso: RECURSO_DE_ANTICIPOS,
      registroId: anticipo.id,
      accion: 'anular',
      anterior,
      motivo: datos.motivo,
    });
    return [this.evento(operador, anticipo, { fecha, enBancos: datos.enBancos })];
  }
  private evento(operador: Operador, anticipo: Anticipo, { fecha, enBancos }: DatosDelEvento): EventoDominio {
    return new AnticipoAnulado({
      empresaId: operador.empresaId,
      anticipoId: anticipo.id,
      numero: anticipo.numero,
      fecha,
      fechaOriginal: anticipo.fecha,
      montoCentavos: anticipo.montoCentavos,
      anulacionEnBancos: enBancos,
    });
  }
}
