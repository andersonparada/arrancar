import type { RepositorioDeDteRecibidos } from '../aplicacion/puertos/repositorio-de-dte-recibidos.js';
import type { DteRecibido, DteRecibidoId } from '../dominio/dte-recibido.js';

/** La bandeja de DTE en memoria, sin seguridad por empresa ni bloqueos: lo justo para probar casos de uso. */
export class RepositorioDeDteRecibidosEnMemoria implements RepositorioDeDteRecibidos {
  readonly filas = new Map<string, DteRecibido>();
  readonly guardadas: string[] = [];

  async buscar(id: DteRecibidoId): Promise<DteRecibido | null> {
    return this.filas.get(id.valor) ?? null;
  }

  async bloquear(id: DteRecibidoId): Promise<DteRecibido | null> {
    return this.buscar(id);
  }

  async buscarVarias(ids: readonly string[]): Promise<DteRecibido[]> {
    return ids.flatMap((id) => this.filas.get(id) ?? []);
  }

  async buscarPorAutorizacion(autorizacionFel: string): Promise<DteRecibido | null> {
    return [...this.filas.values()].find((fila) => fila.instantanea().autorizacionFel === autorizacionFel) ?? null;
  }

  async buscarPorDocumento(documentoId: string): Promise<DteRecibido | null> {
    return [...this.filas.values()].find((fila) => fila.instantanea().documentoId === documentoId) ?? null;
  }

  async agregar(dte: DteRecibido): Promise<void> {
    this.filas.set(dte.id.valor, dte);
  }

  async asignarProveedorALasPendientes(nitEmisor: string, proveedorId: string): Promise<void> {
    for (const fila of this.filas.values()) {
      const { nitEmisor: nit, estado, proveedorId: actual } = fila.instantanea();
      if (nit === nitEmisor && estado === 'pendiente' && actual === null) fila.completar({ proveedorId });
    }
  }

  async guardar(dte: DteRecibido): Promise<void> {
    this.guardadas.push(dte.id.valor);
    this.filas.set(dte.id.valor, dte);
  }
}
