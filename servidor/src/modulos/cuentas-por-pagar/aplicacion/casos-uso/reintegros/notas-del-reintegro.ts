import { exigirNotaQueSeReintegra, type NotaPedida } from '../../../dominio/registro-de-reintegro.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { filaExistente, saldoDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';

/** Una nota ya bloqueada y revisada, con lo que el reintegro necesita de ella. */
export interface NotaRevisada {
  notaId: string;
  montoCentavos: number;
  /** La factura de la nota (o la nota misma, si no tiene) es de activo fijo. */
  deActivoFijo: boolean;
  /** Fecha de recepción en Libro de compras; `null` en un saldo inicial. */
  recepcion: string | null;
}

type Dependencias = Pick<DependenciasDeReintegros, 'documentos' | 'consultas' | 'fechasDeEntrada'>;

/** Bloquea las notas del reintegro y revisa que se puedan reintegrar. */
export class NotasDelReintegro {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Bloquea las notas en orden de id (así dos reintegros a la vez no se traban) y revisa cada una con su saldo libre.
   * @throws RecursoNoEncontrado, NoEsNotaConSaldo, NotaPendienteNoSeAjusta, NotaDeOtroProveedor, NotaEnContrasena,
   * ReintegroMayorQueElSaldoLibre
   */
  async bloquearYRevisar(proveedorId: string, pedidas: readonly NotaPedida[]): Promise<NotaRevisada[]> {
    const conIndice = pedidas.map((pedida, indice) => ({ ...pedida, indice }));
    const enOrden = [...conIndice].sort((a, b) => a.notaId.localeCompare(b.notaId));
    const recepciones = await this.dependencias.fechasDeEntrada.deDocumentos(pedidas.map(({ notaId }) => notaId));
    const revisadas = new Map<string, NotaRevisada>();
    for (const pedida of enOrden) {
      const nota = await this.revisar(proveedorId, pedida);
      revisadas.set(pedida.notaId, { ...nota, recepcion: recepciones.get(pedida.notaId) ?? null });
    }
    return pedidas.map(({ notaId }) => revisadas.get(notaId)!);
  }

  private async revisar(proveedorId: string, pedida: NotaPedida & { indice: number }) {
    const { documentos, consultas } = this.dependencias;
    const guardado = await bloquear(documentos, pedida.notaId);
    const saldoLibreCentavos = saldoDeLaFila(await filaExistente(consultas, pedida.notaId));
    exigirNotaQueSeReintegra(
      { documento: guardado.documento, saldoLibreCentavos, contrasenaVigente: guardado.contrasenaVigente },
      { proveedorId, montoCentavos: pedida.montoCentavos, indice: pedida.indice },
    );
    return {
      notaId: pedida.notaId,
      montoCentavos: pedida.montoCentavos,
      deActivoFijo: await this.facturaEsDeActivo(guardado.documento),
    };
  }

  /** La factura que corrige la nota (el documento afectado) decide el concepto; sin ella, la nota misma. */
  private async facturaEsDeActivo(nota: { tieneActivoFijo: boolean; documentoAfectadoId: string | null }) {
    if (nota.documentoAfectadoId === null) return nota.tieneActivoFijo;
    const factura = await this.dependencias.consultas.buscar(nota.documentoAfectadoId);
    return factura?.documento.tieneActivoFijo ?? nota.tieneActivoFijo;
  }
}
