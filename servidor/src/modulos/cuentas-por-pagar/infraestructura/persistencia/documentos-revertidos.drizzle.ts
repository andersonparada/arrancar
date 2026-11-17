import { sql } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  DocumentoRevertidoEnElMes,
  FiltroDeAjustesDelMes,
} from '../../aplicacion/puertos/puertos-de-reportes-de-control.js';
import { nombreDe } from './nombres-de-personas.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

function aDocumentoRevertido(
  tipoDeBaja: DocumentoRevertidoEnElMes['tipoDeBaja'],
  fila: Fila,
): DocumentoRevertidoEnElMes {
  return {
    documentoId: String(fila.documento_id),
    tipoDeBaja,
    serie: textoONulo(fila.serie),
    numero: String(fila.numero),
    proveedorId: String(fila.proveedor_id),
    proveedorNombre: String(fila.proveedor_nombre),
    emision: String(fila.emision),
    totalCentavos: aCentavos(String(fila.total)),
    estabaAutorizado: fila.estaba_autorizado === true,
    motivo: textoONulo(fila.motivo),
    quien: textoONulo(fila.quien),
    cuando: String(fila.cuando),
  };
}

/** Los documentos anulados con `anulado_en` (día de Guatemala) dentro del mes. */
export async function documentosAnuladosEnElMes(
  transaccion: Transaccion,
  { empresaId, desde, hasta, proveedorId }: FiltroDeAjustesDelMes,
): Promise<DocumentoRevertidoEnElMes[]> {
  const delProveedor = proveedorId ? sql`and d.proveedor_id = ${proveedorId}::uuid` : sql``;
  const { rows } = await transaccion.execute(sql`
    select d.id::text as documento_id, d.serie, d.numero, d.proveedor_id::text, t.nombre_mostrar as proveedor_nombre,
           d.fecha_emision::text as emision, d.total::text, coalesce(d.estaba_autorizado, false) as estaba_autorizado,
           d.motivo_de_anulacion as motivo, ${sql.raw(nombreDe('u'))} as quien, d.anulado_en::text as cuando
      from cuentas_por_pagar.documentos d
      join terceros.proveedores pr on pr.id = d.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join core.usuarios u on u.id = d.anulado_por
     where d.empresa_id = ${empresaId}::uuid and d.estado = 'anulado'
       and (d.anulado_en at time zone 'America/Guatemala')::date between ${desde}::date and ${hasta}::date ${delProveedor}
     order by d.anulado_en, d.id`);
  return (rows as Fila[]).map((fila) => aDocumentoRevertido('anulado', fila));
}

/**
 * Los documentos que volvieron a revisión en el mes, leídos de la auditoría (acción `devolver`): el documento queda
 * como estaba en `anterior`. Una auditoría se ve por cuenta, así que también se filtra por la empresa.
 */
export async function documentosDesautorizadosEnElMes(
  transaccion: Transaccion,
  { empresaId, desde, hasta, proveedorId }: FiltroDeAjustesDelMes,
): Promise<DocumentoRevertidoEnElMes[]> {
  const delProveedor = proveedorId ? sql`and au.anterior ->> 'proveedorId' = ${proveedorId}` : sql``;
  const { rows } = await transaccion.execute(sql`
    select au.registro_id as documento_id, au.anterior ->> 'serie' as serie, au.anterior ->> 'numero' as numero,
           au.anterior ->> 'proveedorId' as proveedor_id, t.nombre_mostrar as proveedor_nombre,
           au.anterior ->> 'fechaEmision' as emision, au.anterior ->> 'total' as total, true as estaba_autorizado,
           au.motivo, ${sql.raw(nombreDe('u'))} as quien, au.creado_en::text as cuando
      from core.auditoria au
      join terceros.proveedores pr on pr.id = (au.anterior ->> 'proveedorId')::uuid
      join terceros.terceros t on t.id = pr.tercero_id
      left join core.usuarios u on u.id = au.usuario_id
     where au.empresa_id = ${empresaId}::uuid and au.recurso = 'cuentas-por-pagar.documentos' and au.accion = 'devolver'
       and (au.creado_en at time zone 'America/Guatemala')::date between ${desde}::date and ${hasta}::date ${delProveedor}
     order by au.creado_en, au.id`);
  return (rows as Fila[]).map((fila) => aDocumentoRevertido('desautorizado', fila));
}
