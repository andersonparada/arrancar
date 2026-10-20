import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { ConsultasDeRetenciones } from '../../aplicacion/puertos/puertos-de-retenciones.js';
import type { RetencionDelReporte } from '../../dominio/retenciones/retencion-del-reporte.js';
import { documentos } from './documentos.tablas.js';
import { retencionDelReporte } from './retencion-del-reporte.mapeador.js';
import { retenciones } from './retenciones.tablas.js';

/** El NIT del proveedor; en la factura especial, el del vendedor, que se guarda como receptor. */
const nitSql = sql<string | null>`case when ${documentos.tipo} = 'factura_especial'
  then ${documentos.nitReceptor} else ${documentos.nitEmisor} end`;

const columnas = {
  retencion: retenciones,
  documento: documentos,
  nit: nitSql,
  nombres: usuarios.nombres,
  apellidos: usuarios.apellidos,
};

const RESUELTAS = ['constancia_anulada', 'rectificada', 'no_requiere'] as const;

/** Las retenciones con su documento, ordenadas por impuesto, regla, fecha y número del documento. */
function consultaBase() {
  return transaccionEnCurso()
    .select(columnas)
    .from(retenciones)
    .innerJoin(
      documentos,
      and(eq(documentos.id, retenciones.documentoId), eq(documentos.empresaId, retenciones.empresaId)),
    )
    .leftJoin(usuarios, eq(usuarios.id, retenciones.resueltaPor));
}

const orden = [
  asc(retenciones.impuesto),
  asc(retenciones.regla),
  asc(retenciones.fecha),
  asc(documentos.serie),
  asc(documentos.numero),
  asc(retenciones.id),
] as const;

/** Bloquea las filas hasta el fin de la transacción, en orden de id para no cruzarse con otro lote. */
async function bloquearRetenciones(ids: readonly string[]): Promise<void> {
  await transaccionEnCurso()
    .select({ id: retenciones.id })
    .from(retenciones)
    .where(inArray(retenciones.id, [...ids]))
    .orderBy(asc(retenciones.id))
    .for('update');
}

/** Las consultas de retenciones: con RLS de la empresa de la transacción. */
export class ConsultasDeRetencionesDrizzle implements ConsultasDeRetenciones {
  async delMes(mes: string): Promise<RetencionDelReporte[]> {
    const filas = await consultaBase()
      .where(
        and(sql`${retenciones.fecha} >= ${mes}::date`, sql`${retenciones.fecha} < (${mes}::date + interval '1 month')`),
      )
      .orderBy(...orden);
    return filas.map(retencionDelReporte);
  }

  async porResolver(estado: 'pendiente' | 'resueltas'): Promise<RetencionDelReporte[]> {
    const donde =
      estado === 'pendiente'
        ? eq(retenciones.resolucion, 'pendiente')
        : inArray(retenciones.resolucion, [...RESUELTAS]);
    const filas = await consultaBase()
      .where(donde)
      .orderBy(asc(retenciones.fecha), asc(documentos.serie), asc(documentos.numero));
    return filas.map(retencionDelReporte);
  }

  async buscar(id: string, bloquear: boolean): Promise<RetencionDelReporte | null> {
    if (bloquear) await bloquearRetenciones([id]);
    const [fila] = await consultaBase().where(eq(retenciones.id, id));
    return fila ? retencionDelReporte(fila) : null;
  }

  async buscarVarias(ids: readonly string[]): Promise<RetencionDelReporte[]> {
    if (ids.length === 0) return [];
    await bloquearRetenciones(ids);
    const filas = await consultaBase()
      .where(inArray(retenciones.id, [...ids]))
      .orderBy(asc(retenciones.id));
    return filas.map(retencionDelReporte);
  }

  async proveedoresConConstancia(numeros: readonly string[]) {
    if (numeros.length === 0) return [];
    const filas = await transaccionEnCurso()
      .selectDistinct({ numero: retenciones.constanciaNumero, proveedorId: documentos.proveedorId })
      .from(retenciones)
      .innerJoin(
        documentos,
        and(eq(documentos.id, retenciones.documentoId), eq(documentos.empresaId, retenciones.empresaId)),
      )
      .where(inArray(retenciones.constanciaNumero, [...numeros]));
    return filas.map((fila) => ({ numero: fila.numero as string, proveedorId: fila.proveedorId }));
  }
}
