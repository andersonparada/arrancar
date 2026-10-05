import type {
  AnulacionDeDocumento,
  DocumentoGuardado,
  NotaDeFactura,
  RepositorioDeDocumentosGuardados,
} from '../aplicacion/puertos/puertos-de-baja-de-documentos.js';
import type { DocumentoDeCompra } from '../dominio/documento-de-compra.js';

/** Documentos ya guardados, en memoria: se siembran con `sembrar` y se leen con lo que dejó cada caso de uso. */
export class DocumentosGuardadosEnMemoria implements RepositorioDeDocumentosGuardados {
  readonly filas = new Map<string, DocumentoGuardado>();
  readonly eliminados: string[] = [];
  readonly bloqueados: string[] = [];

  /** Guarda el documento como vigente y pendiente en el destino; `cambios` lo ajusta (procesado, notas…). */
  sembrar(documento: DocumentoDeCompra, cambios: Partial<DocumentoGuardado> = {}): DocumentoGuardado {
    const guardado: DocumentoGuardado = {
      documento,
      estado: 'vigente',
      anuladoEn: null,
      anuladoPor: null,
      motivoDeAnulacion: null,
      procesadoEnDestinoEn: null,
      notas: [],
      ...cambios,
    };
    this.filas.set(documento.id, guardado);
    return guardado;
  }

  /** Agrega una nota de crédito (vigente o anulada) a la factura sembrada. */
  agregarNota(facturaId: string, estado: NotaDeFactura['estado']): void {
    const nota = { id: crypto.randomUUID(), serie: 'N', numero: '1', fechaEmision: '2026-10-02', total: 5000, estado };
    this.filas.get(facturaId)?.notas.push(nota);
  }

  async buscar(id: string, bloquear: boolean): Promise<DocumentoGuardado | null> {
    if (bloquear) this.bloqueados.push(id);
    return this.filas.get(id) ?? null;
  }

  async anular(id: string, { anuladoPor, motivo }: AnulacionDeDocumento): Promise<void> {
    const guardado = this.filas.get(id);
    if (!guardado) return;
    const anulado = { estado: 'anulado' as const, anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo };
    this.filas.set(id, { ...guardado, ...anulado });
  }

  async eliminar(id: string): Promise<void> {
    this.filas.delete(id);
    this.eliminados.push(id);
  }

  async marcarProcesado(id: string, procesado: boolean): Promise<void> {
    const guardado = this.filas.get(id);
    if (guardado) guardado.procesadoEnDestinoEn = procesado ? new Date() : null;
  }
}
