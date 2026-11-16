import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { fechaDeAnulacionDelPago } from '../../../dominio/anulacion-de-pagos.js';
import { RetiroAnulado } from '../../../dominio/eventos-de-retiros.js';
import { exigirRetiroAnulable } from '../../../dominio/reglas-del-retiro.js';
import { RECURSO_DE_RETIROS, type RetiroDeEfectivo } from '../../../dominio/retiros.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { LectorDelRetiro } from './lector-del-retiro.js';

/** Lo que hizo Bancos con el cheque o la nota del retiro, para fechar la anulación. */
export interface DatosDeAnularElRetiro {
  motivo: string;
  enBancos: 'sin_inverso' | 'con_inverso';
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

type Dependencias = Pick<DependenciasDeRetiros, 'retiros' | 'consultas' | 'movimientos' | 'auditoria' | 'reloj'>;

/**
 * Anular un retiro (diseño de efectivo §4.6), venga de la ventana de aquí o del aviso de Bancos: revisa que se pueda (abierto,
 * sin pagos vigentes, cheque sin cobrar), lo deja `anulado` con su fecha contable, lo audita como estaba y arma el evento
 * que quien llama publica al confirmar.
 */
export class AnuladorDelRetiro {
  private readonly lector: LectorDelRetiro;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelRetiro(dependencias);
  }

  /** @throws RetiroYaAnulado, RetiroLiquidado, RetiroConPagos, RetiroCobrado */
  async revisar(retiro: RetiroDeEfectivo): Promise<void> {
    const { consultas, movimientos } = this.dependencias;
    const pagos = await consultas.pagosDelRetiro(retiro.id);
    exigirRetiroAnulable(retiro, {
      pagosVigentes: pagos
        .filter(({ estado }) => estado === 'vigente')
        .map(({ numero, anioDeNumero }) => numeroDelPago(numero, anioDeNumero)),
      conciliado: retiro.estado === 'abierto' && (await movimientos.estaConciliado(retiro.movimientoId)),
    });
  }

  async anular(operador: Operador, retiro: RetiroDeEfectivo, datos: DatosDeAnularElRetiro): Promise<EventoDominio[]> {
    const { retiros, auditoria, reloj } = this.dependencias;
    const anterior = await this.lector.leer(operador, retiro);
    const hoy = await reloj.hoy(operador);
    const fecha = fechaDeAnulacionDelPago(retiro, { ...datos, hoy });
    await retiros.anular(retiro.id, { anuladoPor: operador.usuarioId, motivo: datos.motivo, fechaDeAnulacion: fecha });
    await auditoria.registrar({
      recurso: RECURSO_DE_RETIROS,
      registroId: retiro.id,
      accion: 'anular',
      anterior,
      motivo: datos.motivo,
    });
    return [
      new RetiroAnulado({
        empresaId: operador.empresaId,
        retiroId: retiro.id,
        numero: retiro.numero,
        fecha,
        fechaOriginal: retiro.fecha,
        anulacionEnBancos: datos.enBancos,
      }),
    ];
  }
}
