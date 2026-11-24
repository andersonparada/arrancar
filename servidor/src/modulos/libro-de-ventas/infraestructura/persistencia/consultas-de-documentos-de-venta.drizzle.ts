import { and, count, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  FiltroDeDocumentosDeVenta,
  PaginaDeDocumentosDeVentaDto,
  PaginacionDeDocumentosDeVenta,
} from '../../aplicacion/dto/documento-de-venta.dto.js';
import type { ConsultasDeDocumentosDeVenta } from '../../aplicacion/puertos/puertos-de-documentos.js';
import { primerDiaDelMes } from '../../dominio/fechas-del-libro.js';
import { documentos } from './documentos.tablas.js';
import { listadoDe } from './ficha-de-documento-de-venta.mapeador.js';

/** Cuántas notas del documento hay, vigentes o en total (la llave foránea cuenta también las anuladas). */
const notas = (vigentes: boolean): SQL<number> =>
  sql<number>`(select count(*) from libro_de_ventas.documentos n where n.documento_afectado_id = ${documentos.id} and n.empresa_id = ${documentos.empresaId}${vigentes ? sql` and n.estado = 'vigente'` : sql``})::int`;

/** Lo que `ILIKE` toma como comodín se escribe literal. */
const comoTexto = (texto: string): string => `%${texto.replace(/[\\%_]/g, (letra) => `\\${letra}`)}%`;

function condicionDeDestino(destino: FiltroDeDocumentosDeVenta['destino']): SQL | undefined {
  if (!destino) return undefined;
  return destino === 'ninguno' ? isNull(documentos.destino) : eq(documentos.destino, destino);
}

function condicionDeCliente({ clienteId, sinCliente }: FiltroDeDocumentosDeVenta): SQL | undefined {
  if (clienteId) return eq(documentos.clienteId, clienteId);
  return sinCliente ? isNull(documentos.clienteId) : undefined;
}

function condicionDeTexto(texto: string | undefined): SQL | undefined {
  if (!texto?.trim()) return undefined;
  const patron = comoTexto(texto.trim());
  return or(
    ilike(documentos.serie, patron),
    ilike(documentos.numero, patron),
    ilike(documentos.nombreReceptor, patron),
    ilike(documentos.nitReceptor, patron),
  );
}

/** El estado es `vigente` por omisión: los anulados solo se ven si se piden. */
function condicionDeEstado(estado: FiltroDeDocumentosDeVenta['estado']): SQL | undefined {
  if (estado === 'todos') return undefined;
  return eq(documentos.estado, estado ?? 'vigente');
}

function condiciones(filtro: FiltroDeDocumentosDeVenta): SQL | undefined {
  return and(
    filtro.periodo ? eq(documentos.periodo, primerDiaDelMes(filtro.periodo)) : undefined,
    condicionDeCliente(filtro),
    filtro.tipo ? eq(documentos.tipo, filtro.tipo) : undefined,
    condicionDeEstado(filtro.estado),
    condicionDeDestino(filtro.destino),
    condicionDeTexto(filtro.texto),
  );
}

/** Lecturas de la lista de documentos; la seguridad por empresa (RLS) limita lo que se ve. */
export class ConsultasDeDocumentosDeVentaDrizzle implements ConsultasDeDocumentosDeVenta {
  async listar(
    filtro: FiltroDeDocumentosDeVenta,
    { pagina, limite }: PaginacionDeDocumentosDeVenta,
  ): Promise<PaginaDeDocumentosDeVentaDto> {
    const donde = condiciones(filtro);
    const transaccion = transaccionEnCurso();
    const [totales] = await transaccion.select({ total: count() }).from(documentos).where(donde);
    const filas = await transaccion
      .select({ fila: documentos, notasVigentes: notas(true), notasEnTotal: notas(false) })
      .from(documentos)
      .where(donde)
      .orderBy(desc(documentos.periodo), desc(documentos.fechaEmision), desc(documentos.creadoEn))
      .limit(limite)
      .offset((pagina - 1) * limite);
    const elementos = filas.map(({ fila, notasVigentes, notasEnTotal }) =>
      listadoDe(fila, {
        anulado: fila.estado === 'anulado',
        procesadoEnElDestino: fila.procesadoEnDestinoEn !== null,
        notasVigentes,
        notasEnTotal,
      }),
    );
    return { elementos, total: totales?.total ?? 0, pagina, limite };
  }
}
