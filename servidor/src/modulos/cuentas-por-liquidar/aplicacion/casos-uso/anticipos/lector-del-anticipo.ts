import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Anticipo } from '../../../dominio/anticipos.js';
import type { AnticipoDto, MovimientoDelAnticipoDto } from '../../dto/anticipos.dto.js';
import { dtoDelAnticipo } from './armado-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';

type Dependencias = Pick<DependenciasDeAnticipos, 'consultas' | 'movimientos' | 'reloj'>;

/** Arma el `AnticipoDto` de un anticipo ya guardado, en cualquier estado: sirve para auditarlo y para responder cómo quedó. */
export class LectorDelAnticipo {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(operador: Operador, anticipo: Anticipo, avisos: readonly string[] = []): Promise<AnticipoDto> {
    const { consultas, movimientos, reloj } = this.dependencias;
    return dtoDelAnticipo({
      anticipo,
      movimiento: await this.movimiento(anticipo.movimientoId),
      gastos: await consultas.gastadoDe(anticipo.id),
      conciliado: anticipo.estado === 'abierto' && (await movimientos.estaConciliado(anticipo.movimientoId)),
      hoy: await reloj.hoy(operador),
      avisos,
    });
  }

  private async movimiento(movimientoId: string): Promise<MovimientoDelAnticipoDto> {
    const datos = await this.dependencias.movimientos.datosDe(movimientoId);
    return { id: movimientoId, cuentaBancariaId: datos?.cuentaBancariaId ?? '', numero: datos?.numero ?? 0 };
  }
}
