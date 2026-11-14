import type {
  AnulacionDeDocumento,
  AutorizacionDeDocumento,
  DocumentoCompletado,
  ConsultasDeCargos,
  DocumentoNuevo,
  FacturaPorBuscar,
  DatosDeAplicacion,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import {
  netoDe,
  type AplicacionDeNota,
  type DocumentoConAplicaciones,
  type DocumentoPorPagar,
} from '../dominio/documento-por-pagar.js';
import type { AjusteDeSaldo } from '../dominio/ajustes.js';
export { CondicionesEnMemoria, DocumentosDeCompraEnMemoria, PlazoFijo } from './dobles-de-condiciones.js';
import { TIPOS_DE_FACTURA } from '../dominio/tipos-de-documento.js';
import type { AplicacionACargo, CargoConSaldo } from '../dominio/reparto-de-nota-de-credito.js';

const sumar = (aplicaciones: readonly AplicacionDeNota[]) =>
  aplicaciones.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

export class AplicacionesEnMemoria implements RepositorioDeAplicaciones {
  lista: AplicacionDeNota[] = [];
  /** Cuántas aplicaciones se han creado, para dar ids distintos. */
  private contador = 0;
  /** Lo que llegó con cada llamada a `agregar` (forma, fecha, referencia). */
  datos: DatosDeAplicacion[] = [];

  async agregar(
    nota: DocumentoPorPagar,
    aplicaciones: readonly AplicacionACargo[],
    datos: DatosDeAplicacion,
  ): Promise<void> {
    this.datos.push(datos);
    this.lista.push(
      ...aplicaciones.map((aplicacion) => ({
        ...aplicacion,
        ...datos,
        id: `aplicacion-${++this.contador}`,
        notaId: nota.id,
        // Solo se conoce la nota, que es el «otro» documento de lo recibido por un cargo.
        otraSerie: nota.serie,
        otroNumero: nota.numero,
      })),
    );
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

  async borrar(aplicacionId: string): Promise<void> {
    this.lista = this.lista.filter((aplicacion) => aplicacion.id !== aplicacionId);
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
  /** Ajustes de saldo sembrados por las pruebas (el caso de uso que los crea llega en CP2-4). */
  ajustes: AjusteDeSaldo[] = [];
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
      facturaDelSistemaAnterior: false,
      ...nuevo,
      origen: 'libro_de_compras',
      saldoAlInicioCentavos: null,
      retencionesPorPracticarCentavos: null,
      referencia: null,
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
      ajustes: this.ajustes.filter(({ documentoId }) => documentoId === documento.id),
      contrasenaVigente: null,
      contrasenas: [],
      notasQueLoCorrigen: this.documentos.filter(({ documentoAfectadoId }) => documentoAfectadoId === documento.id)
        .length,
    };
  }

  async buscarSaldoInicialDeLaFactura(factura: FacturaPorBuscar): Promise<DocumentoPorPagar | null> {
    this.bitacora.push('bloquea-saldo-inicial');
    return (
      this.documentos.find(
        (candidato) =>
          candidato.origen === 'saldo_inicial' &&
          candidato.estado !== 'anulado' &&
          candidato.proveedorId === factura.proveedorId &&
          TIPOS_DE_FACTURA.some((tipo) => tipo === candidato.tipo) &&
          (candidato.serie ?? '') === (factura.serie ?? '') &&
          candidato.numero === factura.numero,
      ) ?? null
    );
  }

  async buscarPorId(id: string, bloquear = true): Promise<DocumentoConAplicaciones | null> {
    const documento = this.documentos.find((candidato) => candidato.id === id);
    if (!documento) return null;
    if (bloquear) this.bitacora.push('bloquea-aqui');
    return {
      documento: { ...documento },
      hechas: await this.aplicaciones.hechasPorLaNota(documento.id),
      recibidas: await this.aplicaciones.recibidasPorElCargo(documento.id),
      ajustes: this.ajustes.filter(({ documentoId }) => documentoId === documento.id),
      contrasenaVigente: null,
      contrasenas: [],
      notasQueLoCorrigen: this.documentos.filter(({ documentoAfectadoId }) => documentoAfectadoId === documento.id)
        .length,
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

  async paraAplicarUnaNota(facturaId: string): Promise<CargoConSaldo[]> {
    this.bloqueadas.push(facturaId);
    const vigentes = this.documentos.filter(({ estado }) => estado !== 'anulado');
    const factura = vigentes.find(({ id }) => id === facturaId);
    if (!factura) return [];
    const debitos = vigentes.filter(
      ({ tipo, documentoAfectadoId }) => tipo === 'nota_de_debito' && documentoAfectadoId === facturaId,
    );
    return [factura, ...debitos].map((cargo) => ({ id: cargo.id, saldoCentavos: this.saldoDe(cargo) }));
  }

  saldoDe(cargo: DocumentoPorPagar): number {
    return netoDe(cargo) - this.aplicaciones.aplicadoAl(cargo);
  }
}
