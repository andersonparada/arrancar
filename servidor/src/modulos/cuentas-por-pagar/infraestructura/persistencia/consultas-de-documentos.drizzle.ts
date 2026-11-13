import { aliasedTable, and, asc, desc, eq, gte, lte, lt, ne, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AjusteConDatos,
  AplicacionConDatos,
  ConsultasDeDocumentos,
  FilaDeDocumento,
  FiltroDeDocumentosPorPagar,
  NotaDeUnDocumento,
  PaginacionDeDocumentos,
} from '../../aplicacion/puertos/puertos-de-consultas.js';
import type { DocumentoPorPagar, FormaDeAplicacion } from '../../dominio/documento-por-pagar.js';
import { ajustesConDatos } from './consultas-de-ajustes.drizzle.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { aFilaDeDocumento, ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { documentos } from './documentos.tablas.js';

type Pagina = { filas: FilaDeDocumento[]; total: number };

const paginaDe = (filas: Array<Parameters<typeof aFilaDeDocumento>[0]>): Pagina => ({
  filas: filas.map(aFilaDeDocumento),
  total: filas[0]?.total ?? 0,
});

/** El estado pedido como condición: un estado, `vigente` (todo menos lo anulado) o `todos`. */
function condicionDeEstado(estado: FiltroDeDocumentosPorPagar['estado']): SQL | undefined {
  if (estado === undefined || estado === 'todos') return undefined;
  return estado === 'vigente' ? ne(documentos.estado, 'anulado') : eq(documentos.estado, estado);
}

/** Las condiciones de la lista; las que no vienen en el filtro no se aplican. */
function condicionesDe(filtro: FiltroDeDocumentosPorPagar, hoy: string, base: ConsultaBaseDeDocumentos) {
  return and(
    filtro.proveedorId ? eq(documentos.proveedorId, filtro.proveedorId) : undefined,
    condicionDeEstado(filtro.estado ?? 'vigente'),
    filtro.tipo ? eq(documentos.tipo, filtro.tipo) : undefined,
    filtro.origen ? eq(documentos.origen, filtro.origen) : undefined,
    filtro.emitidosDesde ? gte(documentos.fechaEmision, filtro.emitidosDesde) : undefined,
    filtro.emitidosHasta ? lte(documentos.fechaEmision, filtro.emitidosHasta) : undefined,
    condicionesDeSaldo(filtro, hoy, base),
  );
}

/** Solo vencidos y con saldo: los dos filtros que miran lo que falta por pagar o lo que queda libre. */
function condicionesDeSaldo(filtro: FiltroDeDocumentosPorPagar, hoy: string, base: ConsultaBaseDeDocumentos) {
  return and(
    filtro.soloVencidos
      ? and(ne(documentos.estado, 'anulado'), lt(documentos.vencimiento, hoy), sql`${base.saldoDelCargo()} > 0`)
      : undefined,
    filtro.conSaldo ? conSaldo(base) : undefined,
  );
}

/** Un cargo con saldo por pagar, o una nota de crédito vigente con saldo libre. */
function conSaldo(base: ConsultaBaseDeDocumentos): SQL {
  return sql`(${documentos.estado} <> 'anulado' and case when ${documentos.tipo} = 'nota_de_credito'
    then ${base.saldoLibreDeLaNota()} > 0 else ${base.saldoDelCargo()} > 0 end)`;
}

type FilaDeNota = {
  nota: typeof documentos.$inferSelect;
  aplicado: string | null;
};

function aNotaDeUnDocumento({ nota, aplicado }: FilaDeNota): NotaDeUnDocumento {
  return {
    id: nota.id,
    documentoId: nota.documentoId,
    tipo: nota.tipo,
    estado: nota.estado,
    serie: nota.serie,
    numero: nota.numero,
    fechaEmision: nota.fechaEmision,
    totalCentavos: aCentavos(nota.total),
    aplicadoAlDocumentoCentavos: aCentavos(aplicado ?? '0'),
  };
}

/** Las aplicaciones con la serie y el número de la nota y del cargo; quien llama agrega el `where`. */
function consultaDeAplicaciones() {
  const nota = aliasedTable(documentos, 'nota');
  const cargo = aliasedTable(documentos, 'cargo');
  return transaccionEnCurso()
    .select({
      notaId: nota.id,
      notaSerie: nota.serie,
      notaNumero: nota.numero,
      cargoId: cargo.id,
      cargoSerie: cargo.serie,
      cargoNumero: cargo.numero,
      monto: aplicacionesDeNotas.monto,
      id: aplicacionesDeNotas.id,
      forma: aplicacionesDeNotas.forma,
      fecha: aplicacionesDeNotas.fecha,
      referencia: aplicacionesDeNotas.referencia,
    })
    .from(aplicacionesDeNotas)
    .innerJoin(nota, eq(nota.id, aplicacionesDeNotas.notaId))
    .innerJoin(cargo, eq(cargo.id, aplicacionesDeNotas.cargoId))
    .orderBy(asc(aplicacionesDeNotas.creadoEn));
}

type FilaDeAplicacion = Awaited<ReturnType<typeof consultaDeAplicaciones>>[number];

function aAplicacionConDatos({ monto, forma, ...resto }: FilaDeAplicacion): AplicacionConDatos {
  return { ...resto, forma: forma as FormaDeAplicacion, montoCentavos: aCentavos(monto) };
}

/** Una nota de crédito rebajó cargos; a un cargo le rebajaron notas. */
const aplicacionesPropiasDe = ({ id, tipo }: DocumentoPorPagar): SQL =>
  tipo === 'nota_de_credito' ? eq(aplicacionesDeNotas.notaId, id) : eq(aplicacionesDeNotas.cargoId, id);

/** Bandeja, lista y ficha de los documentos por pagar. La seguridad por empresa (RLS) limita todas las consultas. */
export class ConsultasDeDocumentosDrizzle implements ConsultasDeDocumentos {
  async listar(
    filtro: FiltroDeDocumentosPorPagar,
    { pagina, limite }: PaginacionDeDocumentos,
    hoy: string,
  ): Promise<Pagina> {
    const base = new ConsultaBaseDeDocumentos();
    const filas = await base
      .seleccionar()
      .where(condicionesDe(filtro, hoy, base))
      .orderBy(desc(documentos.fechaEmision), desc(documentos.creadoEn))
      .limit(limite)
      .offset((pagina - 1) * limite);
    return paginaDe(filas);
  }

  async bandeja(limite: number): Promise<Pagina> {
    const filas = await new ConsultaBaseDeDocumentos()
      .seleccionar()
      .where(eq(documentos.estado, 'pendiente'))
      .orderBy(asc(documentos.creadoEn))
      .limit(limite);
    return paginaDe(filas);
  }

  async buscar(id: string): Promise<FilaDeDocumento | null> {
    const [fila] = await new ConsultaBaseDeDocumentos().seleccionar().where(eq(documentos.id, id));
    return fila ? aFilaDeDocumento(fila) : null;
  }

  async notasDe(documento: DocumentoPorPagar): Promise<NotaDeUnDocumento[]> {
    if (documento.documentoId === null) return [];
    const filas = await transaccionEnCurso()
      .select({
        nota: documentos,
        aplicado: aplicacionesDeNotas.monto,
      })
      .from(documentos)
      .leftJoin(
        aplicacionesDeNotas,
        and(eq(aplicacionesDeNotas.notaId, documentos.id), eq(aplicacionesDeNotas.cargoId, documento.id)),
      )
      .where(eq(documentos.documentoAfectadoId, documento.documentoId))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    return filas.map(aNotaDeUnDocumento);
  }

  async aplicacionesDe(documento: DocumentoPorPagar): Promise<AplicacionConDatos[]> {
    const filas = await consultaDeAplicaciones().where(aplicacionesPropiasDe(documento));
    return filas.map(aAplicacionConDatos);
  }

  async aplicacion(id: string): Promise<AplicacionConDatos | null> {
    const [fila] = await consultaDeAplicaciones().where(eq(aplicacionesDeNotas.id, id));
    return fila ? aAplicacionConDatos(fila) : null;
  }

  ajustesDe(documentoId: string): Promise<AjusteConDatos[]> {
    return ajustesConDatos(documentoId);
  }

  async cargosConSaldoDe(proveedorId: string): Promise<FilaDeDocumento[]> {
    const base = new ConsultaBaseDeDocumentos();
    const filas = await base
      .seleccionar()
      .where(
        and(
          eq(documentos.proveedorId, proveedorId),
          ne(documentos.estado, 'anulado'),
          ne(documentos.tipo, 'nota_de_credito'),
          sql`${base.saldoDelCargo()} > 0`,
        ),
      );
    return filas.map(aFilaDeDocumento);
  }
}
