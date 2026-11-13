import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { netoDe, type DocumentoPorPagar } from '../dominio/documento-por-pagar.js';
import type {
  AjusteConDatos,
  AplicacionConDatos,
  ConsultasDeDocumentos,
  FilaDeDocumento,
  FiltroDeDocumentosPorPagar,
} from '../aplicacion/puertos/puertos-de-consultas.js';
import type { LibroDeCompras, OrdenDeAnulacion } from '../aplicacion/puertos/puertos-de-libro-de-compras.js';
import type { DatosDeRecepcion, DocumentosDeCompra } from '../aplicacion/puertos/puertos-de-documentos.js';
import type { AplicacionesEnMemoria, DocumentosEnMemoria } from './dobles-de-documentos.js';

/** Las consultas de la ficha sobre los mismos documentos en memoria; serie y número vienen del propio documento. */
export class ConsultasEnMemoria implements ConsultasDeDocumentos {
  constructor(
    private readonly documentos: DocumentosEnMemoria,
    private readonly aplicaciones?: AplicacionesEnMemoria,
  ) {}

  async buscar(id: string): Promise<FilaDeDocumento | null> {
    const documento = this.documentos.documentos.find((candidato) => candidato.id === id);
    return documento ? this.filaDe(documento) : null;
  }

  private ajustesVigentesDe({ id }: DocumentoPorPagar) {
    return this.documentos.ajustes.filter(({ documentoId, estado }) => documentoId === id && estado === 'vigente');
  }

  private libroDe(documento: DocumentoPorPagar): FilaDeDocumento['libro'] {
    return {
      proveedorNombre: 'Proveedor',
      proveedorNit: '1234567',
      fechaRecepcion: documento.documentoId === null ? null : documento.fechaEmision,
      periodo: documento.documentoId === null ? null : `${documento.fechaEmision.slice(0, 7)}-01`,
      anulacion: { causa: null, motivo: null, anuladoPor: null, anuladoPorNombre: null, anuladoEn: null },
    };
  }

  private filaDe(documento: DocumentoPorPagar): FilaDeDocumento {
    const vigentes = this.documentos.documentos.filter(
      (nota) => nota.documentoAfectadoId === documento.documentoId && nota.estado !== 'anulado',
    );
    const vigentesDe = this.ajustesVigentesDe(documento);
    return {
      documento: { ...documento },
      libro: this.libroDe(documento),
      creadoEn: '2026-03-10T00:00:00.000Z',
      aplicadoAlCargoCentavos: this.aplicaciones?.aplicadoAl(documento) ?? 0,
      aplicadoPorLaNotaCentavos:
        documento.totalCentavos - (this.aplicaciones?.saldoLibreDe(documento) ?? documento.totalCentavos),
      ajustadoCentavos: vigentesDe.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
      ajustesVigentes: vigentesDe.length,
      aplicacionesManualesRecibidas: 0,
      notasVigentes: vigentes.length,
      notasEnTotal: this.documentos.documentos.filter((nota) => nota.documentoAfectadoId === documento.documentoId)
        .length,
    };
  }

  async listar(filtro: FiltroDeDocumentosPorPagar): Promise<{ filas: FilaDeDocumento[]; total: number }> {
    const filas = this.documentos.documentos
      .filter((documento) => !filtro.origen || documento.origen === filtro.origen)
      .filter((documento) => !filtro.proveedorId || documento.proveedorId === filtro.proveedorId)
      .map((documento) => this.filaDe(documento));
    return { filas, total: filas.length };
  }

  async bandeja(): Promise<{ filas: FilaDeDocumento[]; total: number }> {
    return { filas: [], total: 0 };
  }

  async ajustesDe(documentoId: string): Promise<AjusteConDatos[]> {
    return this.documentos.ajustes
      .filter((ajuste) => ajuste.documentoId === documentoId)
      .map(({ documentoId: _documento, motivoDeAnulacion, ...ajuste }) => ({
        ...ajuste,
        creadoPorNombre: 'Quien ajustó',
        creadoEn: '2026-03-10T00:00:00.000Z',
        anulacion: motivoDeAnulacion ? { motivo: motivoDeAnulacion, anuladoPorNombre: null, anuladoEn: null } : null,
      }));
  }

  async notasDe() {
    return [];
  }

  async aplicacionesDe() {
    return [];
  }

  async aplicacion(id: string): Promise<AplicacionConDatos | null> {
    const aplicacion = this.aplicaciones?.lista.find((candidata) => candidata.id === id);
    if (!aplicacion) return null;
    const nota = this.documentos.documentos.find(({ id: notaId }) => notaId === aplicacion.notaId)!;
    const cargo = this.documentos.documentos.find(({ id: cargoId }) => cargoId === aplicacion.cargoId)!;
    return {
      id,
      forma: aplicacion.forma,
      fecha: aplicacion.fecha,
      referencia: aplicacion.referencia,
      notaId: nota.id,
      notaSerie: nota.serie,
      notaNumero: nota.numero,
      cargoId: cargo.id,
      cargoSerie: cargo.serie,
      cargoNumero: cargo.numero,
      montoCentavos: aplicacion.montoCentavos,
    };
  }

  async cargosConSaldoDe(proveedorId: string): Promise<FilaDeDocumento[]> {
    return this.documentos.documentos
      .filter((d) => d.proveedorId === proveedorId && d.estado !== 'anulado' && d.tipo !== 'nota_de_credito')
      .map((documento) => this.filaDe(documento))
      .filter((fila) => netoDe(fila.documento) - fila.aplicadoAlCargoCentavos > 0);
  }
}

/** Libro de compras en memoria: anota en la bitácora cada orden, en el orden en que llega, y puede rechazarla. */
export class LibroDeComprasEnMemoria implements LibroDeCompras, DocumentosDeCompra {
  readonly procesados = new Map<string, boolean>();
  readonly anulaciones: OrdenDeAnulacion[] = [];
  readonly eliminados: string[] = [];
  rechazo: ReglaDeNegocioInfringida | null = null;
  avisosAlAnular: string[] = [];

  constructor(private readonly bitacora: string[]) {}

  async marcarProcesado(_operador: Operador, documentoId: string, procesado: boolean): Promise<void> {
    this.bitacora.push(`libro:procesado=${procesado}`);
    this.procesados.set(documentoId, procesado);
  }

  async anular(_operador: Operador, orden: OrdenDeAnulacion): Promise<string[]> {
    this.bitacora.push('libro:anular');
    if (this.rechazo) throw this.rechazo;
    this.anulaciones.push(orden);
    return this.avisosAlAnular;
  }

  async eliminar(_operador: Operador, documentoId: string): Promise<void> {
    this.bitacora.push('libro:eliminar');
    if (this.rechazo) throw this.rechazo;
    this.eliminados.push(documentoId);
  }

  async datosDeRecepcion(documentoId: string): Promise<DatosDeRecepcion> {
    return { fechaRecepcion: '2026-03-10', serie: 'A', numero: documentoId };
  }

  async bloquear(): Promise<void> {
    this.bitacora.push('libro:bloquea');
  }
}
