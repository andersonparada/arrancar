import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { DteAnterioresParaSugerir } from '../../aplicacion/puertos/puertos-de-facturas-anteriores.js';
import type { DatosDeFacturaAnterior } from '../../dominio/factura-anterior.js';
import {
  CODIGOS_DTE_DE_LA_FAMILIA,
  FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO,
  FAMILIA_DEL_TIPO_DTE,
  MOTIVO_DE_LA_FAMILIA,
  type TipoDte,
} from '../../dominio/tipos-de-documento.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';

const MAXIMO_DE_SUGERENCIAS = 50;

const CODIGOS_DE_FACTURA: TipoDte[] = FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO.flatMap((familia) => [
  ...CODIGOS_DTE_DE_LA_FAMILIA[familia],
]);

/** Un DTE de factura como lo propondría el formulario de la nota (sin notas de débito anteriores ni detalle). */
function datosDeFacturaDelDte(fila: typeof dteRecibidos.$inferSelect): DatosDeFacturaAnterior {
  const tipo = FAMILIA_DEL_TIPO_DTE[fila.tipoDte];
  return {
    tipo,
    serie: fila.serie,
    numero: fila.numero,
    autorizacionFel: fila.autorizacionFel,
    fechaEmision: fila.fechaEmision,
    total: aCentavos(fila.total),
    iva: aCentavos(fila.iva),
    notasDeDebitoAnterioresTotal: 0,
    notasDeDebitoAnterioresIva: 0,
    motivoSinCredito: MOTIVO_DE_LA_FAMILIA[tipo] ?? null,
    detalleDelMotivo: null,
  };
}

/** La tabla tiene seguridad por empresa (RLS): solo trae los DTE de la empresa de la transacción. */
export class DteAnterioresParaSugerirDrizzle implements DteAnterioresParaSugerir {
  async deFactura(consulta: {
    proveedorId: string;
    nit: string | null;
    fechaDeInicio: string;
  }): Promise<DatosDeFacturaAnterior[]> {
    const delProveedor = or(
      eq(dteRecibidos.proveedorId, consulta.proveedorId),
      consulta.nit ? eq(dteRecibidos.nitEmisor, consulta.nit) : undefined,
    );
    const filas = await transaccionEnCurso()
      .select()
      .from(dteRecibidos)
      .where(
        and(
          delProveedor,
          inArray(dteRecibidos.tipoDte, CODIGOS_DE_FACTURA),
          inArray(dteRecibidos.estado, ['pendiente', 'descartado']),
          eq(dteRecibidos.estadoSat, 'vigente'),
          lt(dteRecibidos.fechaEmision, consulta.fechaDeInicio),
        ),
      )
      .orderBy(desc(dteRecibidos.fechaEmision), desc(dteRecibidos.numero))
      .limit(MAXIMO_DE_SUGERENCIAS);
    return filas.map(datosDeFacturaDelDte);
  }
}
