import { and, count, desc, eq, gte, ilike, isNotNull, isNull, lte, or, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasDeLaBandeja,
  FiltroDeLaBandeja,
  PaginacionDeLaBandeja,
  PaginaDeFilasDeLaBandeja,
} from '../../aplicacion/puertos/puertos-de-la-bandeja.js';
import { mapeadorDeDteRecibido } from './dte-recibido.mapeador.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';
import { documentos } from './documentos.tablas.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';

/** Escapa los comodines de `like` para que la búsqueda sea por el texto tal cual. */
const comoTexto = (busqueda: string): string => `%${busqueda.replace(/[\\%_]/g, '\\$&')}%`;

function porBusqueda(busqueda: string): SQL | undefined {
  const patron = comoTexto(busqueda.trim());
  return or(
    ilike(dteRecibidos.nitEmisor, patron),
    ilike(dteRecibidos.nombreEmisor, patron),
    ilike(dteRecibidos.serie, patron),
    ilike(dteRecibidos.numero, patron),
  );
}

function porProveedor(conProveedor: boolean | undefined): SQL | undefined {
  if (conProveedor === undefined) return undefined;
  return conProveedor ? isNotNull(dteRecibidos.proveedorId) : isNull(dteRecibidos.proveedorId);
}

function porFechas({ desde, hasta }: FiltroDeLaBandeja): SQL | undefined {
  return and(
    desde ? gte(dteRecibidos.fechaEmision, desde) : undefined,
    hasta ? lte(dteRecibidos.fechaEmision, hasta) : undefined,
  );
}

function condiciones(filtro: FiltroDeLaBandeja): SQL | undefined {
  return and(
    filtro.estado ? eq(dteRecibidos.estado, filtro.estado) : undefined,
    porFechas(filtro),
    filtro.tipoDte ? eq(dteRecibidos.tipoDte, filtro.tipoDte) : undefined,
    filtro.loteId ? eq(dteRecibidos.loteId, filtro.loteId) : undefined,
    filtro.busqueda?.trim() ? porBusqueda(filtro.busqueda) : undefined,
    porProveedor(filtro.conProveedor),
  );
}

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class ConsultasDeLaBandejaDrizzle implements ConsultasDeLaBandeja {
  async listar(
    filtro: FiltroDeLaBandeja,
    { pagina, limite }: PaginacionDeLaBandeja,
  ): Promise<PaginaDeFilasDeLaBandeja> {
    const donde = condiciones(filtro);
    const [cuenta] = await transaccionEnCurso().select({ total: count() }).from(dteRecibidos).where(donde);
    const filas = await transaccionEnCurso()
      .select()
      .from(dteRecibidos)
      .where(donde)
      .orderBy(desc(dteRecibidos.fechaEmision), desc(dteRecibidos.serie), desc(dteRecibidos.numero))
      .limit(limite)
      .offset((pagina - 1) * limite);
    return { filas: filas.map((fila) => mapeadorDeDteRecibido.aEntidad(fila)), total: cuenta?.total ?? 0 };
  }

  async ultimoConceptoDelProveedor(proveedorId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ conceptoId: lineasDeDocumento.conceptoId })
      .from(lineasDeDocumento)
      .innerJoin(documentos, eq(documentos.id, lineasDeDocumento.documentoId))
      .innerJoin(conceptosDeGasto, eq(conceptosDeGasto.id, lineasDeDocumento.conceptoId))
      .where(and(eq(documentos.proveedorId, proveedorId), eq(conceptosDeGasto.activo, true)))
      .orderBy(desc(documentos.creadoEn), desc(lineasDeDocumento.numero))
      .limit(1);
    return fila?.conceptoId ?? null;
  }
}
