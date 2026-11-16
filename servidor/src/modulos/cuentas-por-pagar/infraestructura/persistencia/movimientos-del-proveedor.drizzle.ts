import { sql } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { RangoDelEstado } from '../../aplicacion/puertos/puertos-de-reportes-de-proveedor.js';
import type {
  DetalleDelDocumento,
  HechoDelEstado,
  MovimientoDelProveedor,
  RegistroDelMovimiento,
  RetencionDelDocumento,
} from '../../dominio/estado-de-cuenta.js';
import { numeroDelPago } from '../../dominio/pagos.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import { movimientosDelProveedorSql } from './movimientos-del-proveedor.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const centavosDe = (valor: unknown): number => aCentavos(String(valor ?? '0'));
const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

/** Solo los documentos traen total y retenciones; en los demás hechos el documento es la referencia. */
function detalleDe(fila: Fila): DetalleDelDocumento | null {
  if (fila.hecho !== 'documento') return null;
  const esSaldoInicial = fila.es_saldo_inicial === true;
  const neto = centavosDe(fila.total) - centavosDe(fila.retenciones);
  return {
    totalCentavos: centavosDe(fila.total),
    retencionesCentavos: centavosDe(fila.retenciones),
    esSaldoInicial,
    anterioresAlInicioCentavos: esSaldoInicial ? neto - centavosDe(fila.saldo_al_inicio) : null,
  };
}

function registroDe(fila: Fila): RegistroDelMovimiento | null {
  if (fila.registro_numero === null) return null;
  return {
    numero: numeroDelPago(Number(fila.registro_numero), Number(fila.registro_anio)),
    forma: String(fila.forma),
    referencia: textoONulo(fila.referencia),
  };
}

const aMovimiento = (fila: Fila): MovimientoDelProveedor => ({
  hecho: String(fila.hecho) as HechoDelEstado,
  fecha: String(fila.fecha),
  registradoEn: String(fila.registrado_en),
  esCargo: fila.es_cargo === true,
  montoCentavos: centavosDe(fila.monto),
  anulado: fila.anulado === true,
  documento:
    fila.documento_id === null
      ? null
      : {
          id: String(fila.documento_id),
          tipo: String(fila.tipo) as TipoDeDocumento,
          serie: textoONulo(fila.serie),
          numero: String(fila.numero),
        },
  registro: registroDe(fila),
  detalle: detalleDe(fila),
});

/** Los hechos del proveedor en el rango, con las anulaciones en su fecha contable (R3). */
export async function movimientosDelProveedor(
  transaccion: Transaccion,
  rango: RangoDelEstado,
): Promise<MovimientoDelProveedor[]> {
  const { rows } = await transaccion.execute(movimientosDelProveedorSql(rango));
  return (rows as Fila[]).map(aMovimiento);
}

/** Las retenciones (con monto) que Libro de compras fijó a los documentos del proveedor. */
export async function retencionesDelProveedor(
  transaccion: Transaccion,
  empresaId: string,
  proveedorId: string,
): Promise<RetencionDelDocumento[]> {
  const { rows } = await transaccion.execute(sql`
    select d.id::text as documento_id, r.impuesto, r.monto::text as monto, r.constancia_numero
      from cuentas_por_pagar.documentos d
      join libro_de_compras.retenciones r on r.documento_id = d.documento_id and r.empresa_id = d.empresa_id
     where d.empresa_id = ${empresaId}::uuid and d.proveedor_id = ${proveedorId}::uuid and r.monto > 0
     order by r.impuesto desc, r.fecha`);
  return (rows as Fila[]).map((fila) => ({
    documentoId: String(fila.documento_id),
    impuesto: fila.impuesto === 'isr' ? 'isr' : 'iva',
    montoCentavos: centavosDe(fila.monto),
    constanciaNumero: textoONulo(fila.constancia_numero),
  }));
}
