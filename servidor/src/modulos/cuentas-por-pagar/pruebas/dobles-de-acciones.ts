import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import type { ConsultasDeDocumentos, FilaDeDocumento } from '../aplicacion/puertos/puertos-de-consultas.js';
import type { LibroDeCompras, OrdenDeAnulacion } from '../aplicacion/puertos/puertos-de-libro-de-compras.js';
import type { DocumentosDeCompra } from '../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentosEnMemoria } from './dobles-de-documentos.js';

/** Las consultas de la ficha sobre los mismos documentos en memoria; la serie es `A` y el número, el de cada documento. */
export class ConsultasEnMemoria implements ConsultasDeDocumentos {
  readonly numeros = new Map<string, string>();

  constructor(private readonly documentos: DocumentosEnMemoria) {}

  async buscar(id: string): Promise<FilaDeDocumento | null> {
    const documento = this.documentos.documentos.find((candidato) => candidato.id === id);
    if (!documento) return null;
    const vigentes = this.documentos.documentos.filter(
      (nota) => nota.documentoAfectadoId === documento.documentoId && nota.estado !== 'anulado',
    );
    return {
      documento: { ...documento },
      origen: {
        proveedorNombre: 'Proveedor',
        serie: 'A',
        numero: this.numeros.get(id) ?? '1',
        fechaRecepcion: documento.fechaEmision,
        periodo: `${documento.fechaEmision.slice(0, 7)}-01`,
        anulacion: { causa: null, motivo: null, anuladoPor: null, anuladoPorNombre: null, anuladoEn: null },
      },
      aplicadoAlCargoCentavos: 0,
      aplicadoPorLaNotaCentavos: 0,
      notasVigentes: vigentes.length,
      notasEnTotal: this.documentos.documentos.filter((nota) => nota.documentoAfectadoId === documento.documentoId)
        .length,
    };
  }

  async listar(): Promise<{ filas: FilaDeDocumento[]; total: number }> {
    return { filas: [], total: 0 };
  }

  async bandeja(): Promise<{ filas: FilaDeDocumento[]; total: number }> {
    return { filas: [], total: 0 };
  }

  async notasDe() {
    return [];
  }

  async aplicacionesDe() {
    return [];
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

  async fechaDeRecepcion(): Promise<string> {
    return '2026-03-10';
  }

  async bloquear(): Promise<void> {
    this.bitacora.push('libro:bloquea');
  }
}
