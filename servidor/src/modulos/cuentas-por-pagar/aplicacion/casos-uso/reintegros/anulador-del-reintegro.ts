import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { fechaDeAnulacionDelPago, type AnulacionEnBancos } from '../../../dominio/anulacion-de-pagos.js';
import { ReintegroYaAnulado } from '../../../dominio/errores-de-reintegros.js';
import { ReintegroAnulado } from '../../../dominio/eventos-de-reintegros.js';
import {
  efectoDelReintegro,
  numeroDelReintegro,
  RECURSO_DE_REINTEGROS,
  type Reintegro,
} from '../../../dominio/reintegros.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';
import { LectorDelReintegro } from './lector-del-reintegro.js';

/** Lo que hizo Bancos con la nota del depósito, para fechar la anulación; en efectivo, nada. */
export interface DatosDeAnularElReintegro {
  motivo: string;
  enBancos: AnulacionEnBancos;
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

type Dependencias = Pick<
  DependenciasDeReintegros,
  'reintegros' | 'consultas' | 'lecturas' | 'movimientos' | 'auditoria' | 'reloj'
>;

/**
 * Anular un reintegro (diseño de CP4 §5.10), venga de la ventana de aquí o del aviso de Bancos: lo deja `anulado` con su
 * fecha contable (la del reintegro sin inverso, la del inverso con él y hoy en efectivo, nunca antes de su fecha), sus líneas
 * sin vigencia (el saldo libre vuelve a la nota), lo audita como estaba y arma el evento que quien llama publica al confirmar.
 */
export class AnuladorDelReintegro {
  private readonly lector: LectorDelReintegro;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelReintegro(dependencias);
  }

  /** @throws ReintegroYaAnulado */
  revisar(reintegro: Reintegro): void {
    if (reintegro.estado === 'anulado') {
      throw new ReintegroYaAnulado(numeroDelReintegro(reintegro.numero, reintegro.anioDeNumero));
    }
  }

  async anular(operador: Operador, reintegro: Reintegro, datos: DatosDeAnularElReintegro): Promise<EventoDominio[]> {
    const { reintegros, auditoria, reloj } = this.dependencias;
    const anterior = await this.lector.leer(reintegro);
    const fecha = fechaDeAnulacionDelPago(reintegro, { ...datos, hoy: await reloj.hoy(operador) });
    await reintegros.anular(reintegro.id, {
      anuladoPor: operador.usuarioId,
      motivo: datos.motivo,
      fechaDeAnulacion: fecha,
    });
    await auditoria.registrar({
      recurso: RECURSO_DE_REINTEGROS,
      registroId: reintegro.id,
      accion: 'anular',
      anterior,
      motivo: datos.motivo,
    });
    return [this.evento(operador, reintegro, { fecha, enBancos: datos.enBancos })];
  }

  private evento(
    operador: Operador,
    reintegro: Reintegro,
    { fecha, enBancos }: { fecha: string; enBancos: AnulacionEnBancos },
  ): ReintegroAnulado {
    return new ReintegroAnulado({
      empresaId: operador.empresaId,
      reintegroId: reintegro.id,
      fecha,
      fechaOriginal: reintegro.fecha,
      montoCentavos: reintegro.montoCentavos,
      forma: reintegro.forma,
      efecto: efectoDelReintegro(reintegro),
      anulacionEnBancos: enBancos,
    });
  }
}
