import type {
  AnulacionDeDocumento,
  CondicionesDeProveedores,
  ConsultasDeCargos,
  DocumentoNuevo,
  PlazoPorOmision,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import {
  netoDe,
  type AplicacionDeNota,
  type DocumentoConAplicaciones,
  type DocumentoPorPagar,
} from '../dominio/documento-por-pagar.js';
import type { AplicacionACargo, CargoConSaldo } from '../dominio/reparto-de-nota-de-credito.js';

const sumar = (aplicaciones: readonly AplicacionDeNota[]) =>
  aplicaciones.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

export class AplicacionesEnMemoria implements RepositorioDeAplicaciones {
  lista: AplicacionDeNota[] = [];

  async agregar(nota: DocumentoPorPagar, aplicaciones: readonly AplicacionACargo[]): Promise<void> {
    this.lista.push(...aplicaciones.map((aplicacion) => ({ ...aplicacion, notaId: nota.id })));
  }

  async hechasPorLaNota(notaId: string): Promise<AplicacionDeNota[]> {
    return this.lista.filter((aplicacion) => aplicacion.notaId === notaId);
  }

  async recibidasPorElCargo(cargoId: string): Promise<AplicacionDeNota[]> {
    return this.lista.filter((aplicacion) => aplicacion.cargoId === cargoId);
  }

  async borrarDeLaNota(notaId: string): Promise<void> {
    this.lista = this.lista.filter((aplicacion) => aplicacion.notaId !== notaId);
  }

  async borrarDelCargo(cargoId: string): Promise<void> {
    this.lista = this.lista.filter((aplicacion) => aplicacion.cargoId !== cargoId);
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
  documentos: DocumentoPorPagar[] = [];
  /** Las facturas que se bloquearon para aplicar una nota, en orden. */
  readonly bloqueadas: string[] = [];
  /** Lo que se anuló, con su motivo, en orden. */
  readonly anulaciones: Array<AnulacionDeDocumento & { id: string }> = [];

  constructor(private readonly aplicaciones: AplicacionesEnMemoria) {}

  async existe(documentoId: string): Promise<boolean> {
    return this.documentos.some((documento) => documento.documentoId === documentoId);
  }

  async agregar(nuevo: DocumentoNuevo): Promise<DocumentoPorPagar> {
    const guardado: DocumentoPorPagar = {
      ...nuevo,
      id: crypto.randomUUID(),
      estado: 'pendiente',
      registradoEn: null,
      registradoPor: null,
      autorizadoEn: null,
      autorizadoPor: null,
      autorizacionPropia: false,
    };
    this.documentos.push(guardado);
    return guardado;
  }

  async buscarPorDocumentoDeCompra(documentoId: string): Promise<DocumentoConAplicaciones | null> {
    const documento = this.documentos.find((candidato) => candidato.documentoId === documentoId);
    if (!documento) return null;
    return {
      documento: { ...documento },
      hechas: await this.aplicaciones.hechasPorLaNota(documento.id),
      recibidas: await this.aplicaciones.recibidasPorElCargo(documento.id),
    };
  }

  async anular(id: string, anulacion: AnulacionDeDocumento): Promise<void> {
    const documento = this.documentos.find((candidato) => candidato.id === id);
    if (documento) documento.estado = 'anulado';
    this.anulaciones.push({ id, ...anulacion });
  }

  async eliminar(id: string): Promise<void> {
    this.documentos = this.documentos.filter((documento) => documento.id !== id);
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
