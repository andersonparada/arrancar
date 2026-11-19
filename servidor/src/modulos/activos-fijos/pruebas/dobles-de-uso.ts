import type { Cierres } from '../aplicacion/puertos/cierres.js';
import type { LectorDePrimerMes } from '../aplicacion/puertos/lector-de-primer-mes.js';
import type { RepositorioTramos, TramosNuevos } from '../aplicacion/puertos/repositorio-tramos.js';
import type { PrimerMes } from '../dominio/depreciacion/meses.js';
import type { TramoCalculado } from '../dominio/depreciacion/tramo.js';

/** Los tramos en memoria, por activo. */
export class TramosEnMemoria implements RepositorioTramos {
  readonly porActivo = new Map<string, TramoCalculado[]>();

  async agregarVarios({ activoId, tramos }: TramosNuevos): Promise<void> {
    this.porActivo.set(activoId, [...(this.porActivo.get(activoId) ?? []), ...tramos]);
  }

  async vigentesDeActivo(activoId: string): Promise<TramoCalculado[]> {
    return this.porActivo.get(activoId) ?? [];
  }

  async eliminarDeActivo(activoId: string): Promise<void> {
    this.porActivo.delete(activoId);
  }
}

/** Los cierres que la prueba decide: el último mes cerrado y los activos cuyos tramos ya usó un cierre. */
export class CierresDePrueba implements Cierres {
  readonly activosUsados = new Set<string>();

  constructor(public ultimoMes: string | null = null) {}

  async ultimoMesCerrado(): Promise<string | null> {
    return this.ultimoMes;
  }

  async usaronTramosDelActivo(activoId: string): Promise<boolean> {
    return this.activosUsados.has(activoId);
  }
}

export class PrimerMesFijo implements LectorDePrimerMes {
  constructor(public regla: PrimerMes = 'mes_de_inicio') {}

  async paraEmpresa(): Promise<PrimerMes> {
    return this.regla;
  }
}
