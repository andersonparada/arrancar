import type {
  CondicionesDeProveedores,
  DatosDeRecepcion,
  DocumentosDeCompra,
  PlazoPorOmision,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import type { CambioDeCondiciones, CondicionesDeProveedor } from '../dominio/condiciones-de-proveedor.js';

/** Los días de crédito de cada proveedor, en un mapa. */
export class CondicionesEnMemoria implements CondicionesDeProveedores {
  readonly dias = new Map<string, number | null>();
  readonly desdeLaRecepcion = new Set<string>();

  async deProveedor(proveedorId: string): Promise<CondicionesDeProveedor> {
    return {
      diasDeCredito: this.dias.get(proveedorId) ?? null,
      contarDesdeLaRecepcion: this.desdeLaRecepcion.has(proveedorId),
    };
  }

  async existeElProveedor(): Promise<boolean> {
    return true;
  }

  async guardar(proveedorId: string, cambio: CambioDeCondiciones): Promise<void> {
    if (cambio.diasDeCredito !== undefined) this.dias.set(proveedorId, cambio.diasDeCredito);
    if (cambio.contarDesdeLaRecepcion === undefined) return;
    if (cambio.contarDesdeLaRecepcion) this.desdeLaRecepcion.add(proveedorId);
    else this.desdeLaRecepcion.delete(proveedorId);
  }
}

/** La fecha de recepción de cada documento; la que no se fija es la misma de emisión de las pruebas. */
export class DocumentosDeCompraEnMemoria implements DocumentosDeCompra {
  readonly recepciones = new Map<string, string>();

  constructor(private readonly recepcionPorOmision = '2026-03-10') {}

  async bloquear(): Promise<void> {}

  async datosDeRecepcion(documentoId: string): Promise<DatosDeRecepcion> {
    const fechaRecepcion = this.recepciones.get(documentoId) ?? this.recepcionPorOmision;
    return { fechaRecepcion, serie: 'A', numero: documentoId };
  }
}

export class PlazoFijo implements PlazoPorOmision {
  constructor(private readonly mesesFijos = 1) {}

  async meses(): Promise<number> {
    return this.mesesFijos;
  }
}
