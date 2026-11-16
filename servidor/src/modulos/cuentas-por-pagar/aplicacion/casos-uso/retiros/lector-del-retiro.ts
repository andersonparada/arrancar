import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { MovimientoDelRetiroDto, RetiroDto } from '../../dto/retiros.dto.js';
import { dtoDelRetiro } from './armado-del-retiro.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';

type Dependencias = Pick<DependenciasDeRetiros, 'consultas' | 'movimientos' | 'reloj'>;

/**
 * Arma el `RetiroDto` de un retiro ya guardado, en cualquier estado: sirve para auditarlo como estaba antes de cambiarlo
 * y para responder cómo quedó.
 */
export class LectorDelRetiro {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(operador: Operador, retiro: RetiroDeEfectivo, avisos: readonly string[] = []): Promise<RetiroDto> {
    const { consultas, movimientos, reloj } = this.dependencias;
    return dtoDelRetiro({
      retiro,
      pagos: await consultas.pagosDelRetiro(retiro.id),
      movimiento: await this.movimiento(retiro.movimientoId),
      deposito: retiro.movimientoDeDevolucionId ? await this.movimiento(retiro.movimientoDeDevolucionId) : null,
      conciliado: retiro.estado === 'abierto' && (await movimientos.estaConciliado(retiro.movimientoId)),
      hoy: await reloj.hoy(operador),
      usuarioId: operador.usuarioId,
      avisos,
    });
  }

  private async movimiento(movimientoId: string): Promise<MovimientoDelRetiroDto> {
    const datos = await this.dependencias.movimientos.datosDe(movimientoId);
    return { id: movimientoId, cuentaBancariaId: datos?.cuentaBancariaId ?? '', numero: datos?.numero ?? 0 };
  }
}
