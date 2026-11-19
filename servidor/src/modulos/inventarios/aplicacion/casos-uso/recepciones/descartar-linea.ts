import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavosEnteros } from '../../../dominio/decimales.js';
import { motivoDeDescarteValido } from '../../../dominio/descarte.js';
import { LineaConRecepciones, LineaDescartada, LineaNoRecibible } from '../../../dominio/errores-de-recepcion.js';
import { esNotaDeCredito, type LineaDeCompra } from '../../../dominio/linea-de-compra.js';
import type { DescarteDto } from '../../dto/por-recibir.dto.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

/** V-8: la línea deja de ser inventario en el libro y vuelve a ser gasto con su concepto. */
export const AVISO_DE_DESCARTE =
  'La línea dejará de ser inventario en el Libro de compras: vuelve a gasto con su concepto. Si en realidad era un bien de uso, la marca de activo fijo no se pone desde aquí: se corrige en el libro (anular y registrar de nuevo, si importa la casilla del SAT-2237).';

interface DescartePedido {
  lineaId: string;
  motivo: string;
}

/** La línea tal como queda en la auditoría: de qué documento es, qué número y cuánto costó. */
export const lineaParaAuditoria = (linea: LineaDeCompra) => ({
  lineaId: linea.lineaId,
  documento: linea.documento,
  numeroDeLinea: linea.numeroDeLinea,
  costo: deCentavosEnteros(linea.costoCentavos),
});

/** Solo se descarta una línea que está en la bandeja: de un documento vigente, sin recepciones y sin descarte. */
function exigirDescartable(linea: LineaDeCompra): void {
  if (!linea.documentoVigente) throw new LineaNoRecibible('El documento de la línea está anulado en el libro.');
  if (linea.descartada) throw new LineaDescartada();
  if (linea.aplicadoCentavos !== 0n) throw new LineaConRecepciones();
  if (!linea.esInventario && !esNotaDeCredito(linea))
    throw new LineaNoRecibible('La línea no está marcada como inventario en el libro.');
}

export class DescartarLinea {
  constructor(private readonly dependencias: DependenciasDeRecepciones) {}

  /**
   * Aparta una línea de la bandeja con su motivo (era gasto) y lo deja en la auditoría (`descartar`). Si la línea estaba
   * marcada como inventario, en la misma transacción manda al libro quitarle la marca (V-8, P-2 a): un error del libro
   * (documento anulado, línea que ya es activo fijo) deshace todo. Una nota de crédito sin marca se descarta sin tocar el
   * libro. Toma el candado de la línea.
   * @throws LineaNoRecibible si la línea no existe, su documento está anulado o no es de la bandeja.
   * @throws LineaDescartada si ya está descartada.
   * @throws LineaConRecepciones si tiene recepciones, devoluciones o rebajas vigentes (se anulan antes).
   * @throws MotivoDeDescarteInvalido si falta el motivo.
   */
  async ejecutar(operador: Operador, { lineaId, motivo }: DescartePedido): Promise<DescarteDto> {
    const { unidadDeTrabajo, lineas } = this.dependencias;
    const limpio = motivoDeDescarteValido(motivo);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await lineas.bloquear([lineaId]);
      const [linea] = await lineas.buscar([lineaId]);
      if (!linea) throw new LineaNoRecibible();
      exigirDescartable(linea);
      return this.descartar(operador, { linea, motivo: limpio });
    });
  }

  /** Quita la marca en el libro si la tenía, guarda el descarte y lo audita. */
  private async descartar(operador: Operador, { linea, motivo }: { linea: LineaDeCompra; motivo: string }) {
    const { descartes, marcas, auditoria } = this.dependencias;
    const { lineaId, documentoId, esInventario: quitoLaMarca } = linea;
    if (quitoLaMarca) await marcas.cambiar(operador, { lineaId, documentoId, esInventario: false, motivo });
    await descartes.agregar({ empresaId: operador.empresaId, lineaId, documentoId, motivo, quitoLaMarca });
    await auditoria.registrar({
      recurso: 'inventarios.recepciones',
      registroId: lineaId,
      accion: 'descartar',
      anterior: lineaParaAuditoria(linea),
      motivo,
    });
    return { lineaId, avisos: quitoLaMarca ? [AVISO_DE_DESCARTE] : [] };
  }
}
