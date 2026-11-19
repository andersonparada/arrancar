import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { DesgloseDeMovimientos } from '../aplicacion/desglose-de-movimientos.js';
import type { AvisoDeMovimientoPorCambiar, AvisosDeMovimientos } from '../aplicacion/puertos/avisos-de-movimientos.js';
import type { ModulosDeOrigen } from '../aplicacion/puertos/modulos-de-origen.js';
import type { LineaDeDesgloseGuardada, RepositorioDeDesglose } from '../aplicacion/puertos/repositorio-de-desglose.js';
import { RevisorDeCambios } from '../aplicacion/revisor-de-cambios.js';

/** Los avisos que Bancos manda al módulo de origen: los guarda y, si se le pide, los rechaza. */
export class AvisosEnMemoria implements AvisosDeMovimientos {
  readonly recibidos: AvisoDeMovimientoPorCambiar[] = [];
  /** Si se pone, el siguiente aviso lanza este error (el módulo de origen lo rechaza). */
  rechazarCon: Error | null = null;

  async porCambiar(_operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    this.recibidos.push(aviso);
    if (this.rechazarCon) throw this.rechazarCon;
  }
}

/** El reparto por concepto guardado, por movimiento. */
export class DesglosesEnMemoria implements RepositorioDeDesglose {
  readonly porMovimiento = new Map<string, LineaDeDesgloseGuardada[]>();

  async reemplazar(_empresaId: string, movimientoId: string, lineas: LineaDeDesgloseGuardada[]): Promise<void> {
    if (lineas.length === 0) this.porMovimiento.delete(movimientoId);
    else this.porMovimiento.set(movimientoId, lineas);
  }
}

/** Lo que los casos de uso necesitan para tocar movimientos de otro módulo o notas marcadas, con dobles. */
export function piezasDeOrigenEnMemoria(conceptos: ConceptosDeMovimientos, modulosDeOrigen: ModulosDeOrigen) {
  const avisos = new AvisosEnMemoria();
  const desgloses = new DesglosesEnMemoria();
  return {
    avisos,
    desgloses,
    modulosDeOrigen,
    revisor: new RevisorDeCambios({ avisos, modulosDeOrigen }),
    desglose: new DesgloseDeMovimientos({ conceptos, repositorio: desgloses }),
  };
}
