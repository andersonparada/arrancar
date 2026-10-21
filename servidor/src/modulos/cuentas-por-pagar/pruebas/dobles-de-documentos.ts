import type {
  CondicionesDeProveedores,
  ConsultasDeCargos,
  DocumentoNuevo,
  PlazoPorOmision,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import { netoDe, type DocumentoPorPagar } from '../dominio/documento-por-pagar.js';
import type { AplicacionACargo, CargoConSaldo } from '../dominio/reparto-de-nota-de-credito.js';

export interface AplicacionGuardada extends AplicacionACargo {
  notaId: string;
}

const sumar = (aplicaciones: readonly AplicacionGuardada[]) =>
  aplicaciones.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

export class AplicacionesEnMemoria implements RepositorioDeAplicaciones {
  readonly lista: AplicacionGuardada[] = [];

  async agregar(nota: DocumentoPorPagar, aplicaciones: readonly AplicacionACargo[]): Promise<void> {
    this.lista.push(...aplicaciones.map((aplicacion) => ({ ...aplicacion, notaId: nota.id })));
  }

  /** Lo que ya rebajaron las notas de un cargo. */
  aplicadoAl(cargo: DocumentoPorPagar): number {
    return sumar(this.lista.filter(({ cargoId }) => cargoId === cargo.id));
  }

  /** Lo que una nota todavía no aplicó a ningún cargo. */
  saldoLibreDe(nota: DocumentoPorPagar): number {
    return nota.totalCentavos - sumar(this.lista.filter(({ notaId }) => notaId === nota.id));
  }
}

/** Documentos en memoria, con las mismas cuentas de saldo que la consulta real. */
export class DocumentosEnMemoria implements RepositorioDeDocumentos, ConsultasDeCargos {
  readonly documentos: DocumentoPorPagar[] = [];
  /** Las facturas que se bloquearon para aplicar una nota, en orden. */
  readonly bloqueadas: string[] = [];

  constructor(private readonly aplicaciones: AplicacionesEnMemoria) {}

  async existe(documentoId: string): Promise<boolean> {
    return this.documentos.some((documento) => documento.documentoId === documentoId);
  }

  async agregar(nuevo: DocumentoNuevo): Promise<DocumentoPorPagar> {
    const guardado: DocumentoPorPagar = { ...nuevo, id: crypto.randomUUID(), estado: 'pendiente' };
    this.documentos.push(guardado);
    return guardado;
  }

  async paraAplicarUnaNota(facturaDeCompraId: string): Promise<CargoConSaldo[]> {
    this.bloqueadas.push(facturaDeCompraId);
    const vigentes = this.documentos.filter(({ estado }) => estado !== 'anulado');
    const factura = vigentes.find(({ documentoId }) => documentoId === facturaDeCompraId);
    if (!factura) return [];
    const debitos = vigentes.filter(
      ({ tipo, documentoAfectadoId }) => tipo === 'nota_de_debito' && documentoAfectadoId === facturaDeCompraId,
    );
    return [factura, ...debitos].map((cargo) => ({ id: cargo.id, saldoCentavos: this.saldoDe(cargo) }));
  }

  saldoDe(cargo: DocumentoPorPagar): number {
    return netoDe(cargo) - this.aplicaciones.aplicadoAl(cargo);
  }
}

/** Los días de crédito de cada proveedor, en un mapa. */
export class CondicionesEnMemoria implements CondicionesDeProveedores {
  readonly dias = new Map<string, number | null>();

  async diasDeCredito(proveedorId: string): Promise<number | null> {
    return this.dias.get(proveedorId) ?? null;
  }
}

export class PlazoFijo implements PlazoPorOmision {
  constructor(private readonly mesesFijos = 1) {}

  async meses(): Promise<number> {
    return this.mesesFijos;
  }
}
