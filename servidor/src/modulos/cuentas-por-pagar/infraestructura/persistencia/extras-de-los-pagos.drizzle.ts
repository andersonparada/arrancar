import { sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ExtrasDeLosPagos, ExtrasDelPago } from '../../aplicacion/puertos/puertos-de-lista-de-pagos.js';
import { nombreDe } from './nombres-de-personas.sql.js';

type Fila = Record<string, string | number | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

function aRetiro(fila: Fila): ExtrasDelPago['retiro'] {
  if (fila.retiro_id === null) return null;
  return {
    id: String(fila.retiro_id),
    numero: Number(fila.retiro_numero),
    anioDeNumero: Number(fila.retiro_anio),
    custodio: String(fila.custodio),
    estado: String(fila.retiro_estado),
  };
}

/** Lo que solo trae la ficha de un pago: referencia, quien recibió, el retiro y quién lo registró. Con RLS por empresa. */
export class ExtrasDeLosPagosDrizzle implements ExtrasDeLosPagos {
  async extrasDe(pagoId: string): Promise<ExtrasDelPago | null> {
    const { rows } = await transaccionEnCurso().execute(sql`
      select p.referencia, p.recibido_por, p.motivo_sin_bancarizar, p.creado_en,
             ${sql.raw(nombreDe('u'))} as creado_por_nombre,
             r.id::text as retiro_id, r.numero as retiro_numero, r.anio_de_numero as retiro_anio, r.custodio,
             r.estado as retiro_estado
        from cuentas_por_pagar.pagos p
        left join core.usuarios u on u.id = p.creado_por
        left join cuentas_por_pagar.retiros_de_efectivo r on r.id = p.retiro_id
       where p.id = ${pagoId}::uuid`);
    const fila = rows[0] as (Fila & { creado_en: Date | string }) | undefined;
    if (!fila) return null;
    return {
      referencia: textoONulo(fila.referencia),
      recibidoPor: textoONulo(fila.recibido_por),
      motivoSinBancarizar: textoONulo(fila.motivo_sin_bancarizar),
      retiro: aRetiro(fila),
      creadoPorNombre: textoONulo(fila.creado_por_nombre),
      creadoEn: new Date(fila.creado_en).toISOString(),
    };
  }
}
