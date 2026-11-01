import type {
  AnulacionDeDocumento,
  AutorizacionDeDocumento,
  DocumentoCompletado,
  CondicionesDeProveedores,
  ConsultasDeCargos,
  DocumentoNuevo,
  DocumentosDeCompra,
  PlazoPorOmision,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import type { CambioDeCondiciones, CondicionesDeProveedor } from '../dominio/condiciones-de-proveedor.js';
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
  /** El orden en que se bloqueó y se ordenó, junto con las órdenes a Libro de compras (ver `LibroDeComprasEnMemoria`). */
  readonly bitacora: string[] = [];
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
      ingresadoPor: null,
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

  async buscarPorId(id: string): Promise<DocumentoConAplicaciones | null> {
    const documento = this.documentos.find((candidato) => candidato.id === id);
    if (!documento) return null;
    this.bitacora.push('bloquea-aqui');
    return {
      documento: { ...documento },
      hechas: await this.aplicaciones.hechasPorLaNota(documento.id),
      recibidas: await this.aplicaciones.recibidasPorElCargo(documento.id),
    };
  }

  async registrar(id: string, { registradoPor, vencimiento }: DocumentoCompletado): Promise<void> {
    Object.assign(this.con(id), { estado: 'registrado', registradoEn: 'ahora', registradoPor, vencimiento });
  }

  async cambiarVencimiento(id: string, vencimiento: string): Promise<void> {
    this.con(id).vencimiento = vencimiento;
  }

  async autorizar(id: string, { autorizadoPor, autorizacionPropia }: AutorizacionDeDocumento): Promise<void> {
    Object.assign(this.con(id), { estado: 'autorizado', autorizadoEn: 'ahora', autorizadoPor, autorizacionPropia });
  }

  async desautorizar(id: string): Promise<void> {
    Object.assign(this.con(id), {
      estado: 'registrado',
      autorizadoEn: null,
      autorizadoPor: null,
      autorizacionPropia: false,
    });
  }

  private con(id: string): DocumentoPorPagar {
    return this.documentos.find((candidato) => candidato.id === id)!;
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

  async fechaDeRecepcion(documentoId: string): Promise<string> {
    return this.recepciones.get(documentoId) ?? this.recepcionPorOmision;
  }
}

export class PlazoFijo implements PlazoPorOmision {
  constructor(private readonly mesesFijos = 1) {}

  async meses(): Promise<number> {
    return this.mesesFijos;
  }
}
