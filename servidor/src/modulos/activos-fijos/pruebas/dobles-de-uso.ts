import type { Cierres } from '../aplicacion/puertos/cierres.js';
import type { LectorDePrimerMes } from '../aplicacion/puertos/lector-de-primer-mes.js';
import type { RepositorioTramos, TramosDeCambio, TramosNuevos } from '../aplicacion/puertos/repositorio-tramos.js';
import type { PrimerMes } from '../dominio/depreciacion/meses.js';
import type { TramoCalculado, TramoGuardado } from '../dominio/depreciacion/tramo.js';

/** Un tramo guardado en memoria: los de la prueba traen lo básico; los de una mejora, además, su mejora y su estado. */
type TramoEnMemoria = TramoCalculado & {
  mejoraId?: string | null;
  divisionId?: string | null;
  vigente?: boolean;
  anulado?: boolean;
};

/** Los tramos en memoria, por activo. */
export class TramosEnMemoria implements RepositorioTramos {
  readonly porActivo = new Map<string, TramoEnMemoria[]>();
  private readonly ids = new WeakMap<object, string>();
  private readonly ordenes = new WeakMap<object, number>();
  private contador = 0;

  async agregarVarios({ activoId, tramos }: TramosNuevos): Promise<void> {
    this.porActivo.set(activoId, [...(this.porActivo.get(activoId) ?? []), ...tramos.map((t) => this.anotar(t))]);
  }

  async vigentesDeActivo(activoId: string): Promise<TramoCalculado[]> {
    return this.vigentes(activoId);
  }

  async vigentesConIdDeActivo(activoId: string): Promise<TramoGuardado[]> {
    return this.vigentes(activoId).map((tramo) => ({ ...tramo, id: this.idDe(tramo) }));
  }

  async reemplazar({ activoId, mejoraId, divisionId, tramos }: TramosDeCambio): Promise<void> {
    const lista = this.porActivo.get(activoId) ?? [];
    for (const nuevo of tramos) {
      for (const previo of lista) {
        const igual = previo.libro === nuevo.libro && previo.desdePeriodo === nuevo.desdePeriodo;
        if (igual && previo.vigente !== false) previo.vigente = false;
      }
      lista.push(this.anotar({ ...nuevo, mejoraId, divisionId, vigente: true }));
    }
    this.porActivo.set(activoId, lista);
  }

  async anularDeMejora(mejoraId: string): Promise<void> {
    this.apagarYReponer((tramo) => tramo.mejoraId === mejoraId);
  }

  async anularDeDivision(divisionId: string): Promise<void> {
    this.apagarYReponer((tramo) => tramo.divisionId === divisionId);
  }

  private apagarYReponer(es: (tramo: TramoEnMemoria) => boolean): void {
    for (const lista of this.porActivo.values()) {
      const apagados = lista.filter((tramo) => es(tramo) && tramo.vigente !== false);
      for (const apagado of apagados) {
        Object.assign(apagado, { vigente: false, anulado: true });
        const previo = lista
          .filter((t) => t.libro === apagado.libro && t.desdePeriodo === apagado.desdePeriodo)
          .filter((t) => t.vigente === false && !t.anulado && this.orden(t) < this.orden(apagado))
          .sort((a, b) => this.orden(b) - this.orden(a))[0];
        if (previo) previo.vigente = true;
      }
    }
  }

  async hayCambiosPosterioresALaMejora(mejoraId: string): Promise<boolean> {
    for (const lista of this.porActivo.values()) {
      const propios = lista.filter((tramo) => tramo.mejoraId === mejoraId).map((t) => this.orden(t));
      if (propios.length === 0) continue;
      return lista.some((t) => t.vigente !== false && this.orden(t) > Math.max(...propios));
    }
    return false;
  }

  async eliminarDeActivo(activoId: string): Promise<void> {
    this.porActivo.delete(activoId);
  }

  private vigentes(activoId: string): TramoEnMemoria[] {
    return (this.porActivo.get(activoId) ?? []).filter((tramo) => tramo.vigente !== false);
  }

  private anotar(tramo: TramoEnMemoria): TramoEnMemoria {
    this.ordenes.set(tramo, ++this.contador);
    return tramo;
  }

  private orden(tramo: TramoEnMemoria): number {
    return this.ordenes.get(tramo) ?? 0;
  }

  private idDe(tramo: TramoEnMemoria): string {
    const id = this.ids.get(tramo) ?? `tramo-${this.orden(tramo)}-${tramo.libro}`;
    this.ids.set(tramo, id);
    return id;
  }
}

/** Los cierres que la prueba decide: el último mes cerrado y los activos o mejoras cuyos tramos ya usó un cierre. */
export class CierresDePrueba implements Cierres {
  readonly activosUsados = new Set<string>();
  readonly mejorasUsadas = new Set<string>();

  constructor(public ultimoMes: string | null = null) {}

  async ultimoMesCerrado(): Promise<string | null> {
    return this.ultimoMes;
  }

  async usaronTramosDelActivo(activoId: string): Promise<boolean> {
    return this.activosUsados.has(activoId);
  }

  async usaronTramosDeLaMejora(mejoraId: string): Promise<boolean> {
    return this.mejorasUsadas.has(mejoraId);
  }

  async bloquear(): Promise<void> {}
}

export class PrimerMesFijo implements LectorDePrimerMes {
  constructor(public regla: PrimerMes = 'mes_de_inicio') {}

  async paraEmpresa(): Promise<PrimerMes> {
    return this.regla;
  }
}
