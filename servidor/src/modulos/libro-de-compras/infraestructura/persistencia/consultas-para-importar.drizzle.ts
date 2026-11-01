import { and, eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ConsultasParaImportar, ProveedorPorNit } from '../../aplicacion/puertos/puertos-de-importacion.js';
import { documentos } from './documentos.tablas.js';

const TAMANO_DE_TANDA = 1000;

function tandas<T>(elementos: readonly T[]): T[][] {
  const resultado: T[][] = [];
  for (let i = 0; i < elementos.length; i += TAMANO_DE_TANDA) resultado.push(elementos.slice(i, i + TAMANO_DE_TANDA));
  return resultado;
}

/** Consultas en lote de la carga de un archivo. RLS limita los documentos a la empresa y los proveedores a la cuenta. */
export class ConsultasParaImportarDrizzle implements ConsultasParaImportar {
  async documentosVigentes(autorizaciones: readonly string[]): Promise<Map<string, string>> {
    const resultado = new Map<string, string>();
    for (const tanda of tandas(autorizaciones)) {
      const filas = await transaccionEnCurso()
        .select({ id: documentos.id, autorizacion: documentos.autorizacionFel })
        .from(documentos)
        .where(and(inArray(documentos.autorizacionFel, tanda), eq(documentos.estado, 'vigente')));
      for (const { id, autorizacion } of filas) if (autorizacion) resultado.set(autorizacion, id);
    }
    return resultado;
  }

  /** Pregunta a la función `security definer`: responde solo sí o no y solo por las demás empresas de la cuenta. */
  async registradasEnOtraEmpresa(autorizaciones: readonly string[]): Promise<Set<string>> {
    const resultado = new Set<string>();
    for (const tanda of tandas(autorizaciones)) {
      const filas = await transaccionEnCurso().execute<{ autorizacion: string }>(
        sql`select a::text as autorizacion from unnest(string_to_array(${tanda.join(',')}, ',')::uuid[]) as a where libro_de_compras.autorizacion_registrada_fuera(a)`,
      );
      for (const { autorizacion } of filas.rows) resultado.add(autorizacion);
    }
    return resultado;
  }

  async proveedoresPorNit(nits: readonly string[]): Promise<Map<string, ProveedorPorNit>> {
    const resultado = new Map<string, ProveedorPorNit>();
    for (const tanda of tandas(nits)) {
      const filas = await transaccionEnCurso()
        .select({
          nit: terceros.nit,
          id: proveedores.id,
          papelActivo: proveedores.activo,
          terceroActivo: terceros.activo,
        })
        .from(proveedores)
        .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
        .where(inArray(terceros.nit, tanda));
      for (const fila of filas) {
        if (fila.nit) resultado.set(fila.nit, { id: fila.id, activo: fila.papelActivo && fila.terceroActivo });
      }
    }
    return resultado;
  }
}
