import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import type {
  ChequesDeAperturaSinLigar,
  ConsultasDeChequesDeApertura,
} from '../../aplicacion/puertos/puertos-de-consultas.js';
import { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { documentos } from './documentos.tablas.js';

const sonPosfechadosSinLigar = and(
  eq(movimientos.parteDeApertura, 'cheque_posfechado'),
  isNull(movimientos.moduloDeOrigen),
  isNull(movimientos.anuladoEn),
  isNull(movimientos.revertidoEn),
  isNull(movimientos.revierteAId),
);

/** El proveedor tiene cargos de saldo inicial con deuda: las facturas que un posfechado de apertura pudo haber pagado. */
async function tieneSaldoInicialPendiente(proveedorId: string, hoy: string): Promise<boolean> {
  const base = new ConsultaBaseDeDocumentos(hoy);
  const [fila] = await transaccionEnCurso()
    .select({ cargos: count() })
    .from(documentos)
    .leftJoin(base.alCargo, eq(base.alCargo.cargoId, documentos.id))
    .leftJoin(base.pagadoAlCargo, eq(base.pagadoAlCargo.cargoId, documentos.id))
    .leftJoin(base.ajustadoDeLaNota, eq(base.ajustadoDeLaNota.notaId, documentos.id))
    .where(
      and(
        eq(documentos.proveedorId, proveedorId),
        eq(documentos.origen, 'saldo_inicial'),
        sql`${documentos.estado} <> 'anulado' and ${documentos.tipo} <> 'nota_de_credito'`,
        sql`${base.deudaDelCargo()} > 0`,
      ),
    );
  return (fila?.cargos ?? 0) > 0;
}

export async function chequesDeAperturaSinLigarDelProveedor(
  proveedorId: string,
  hoy: string,
): Promise<ChequesDeAperturaSinLigar> {
  const [proveedor] = await transaccionEnCurso()
    .select({ nombre: terceros.nombreMostrar })
    .from(proveedores)
    .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
    .where(eq(proveedores.id, proveedorId));
  if (!proveedor) return { cantidad: 0, totalCentavos: 0 };
  const coincideElNombre = sql`${movimientos.beneficiarioParaComparar} = bancos.nombre_para_comparar(${proveedor.nombre})`;
  const delProveedor = (await tieneSaldoInicialPendiente(proveedorId, hoy)) ? undefined : coincideElNombre;
  const [fila] = await transaccionEnCurso()
    .select({ cantidad: count(), total: sql<string>`coalesce(sum(${movimientos.monto}), 0)` })
    .from(movimientos)
    .where(and(sonPosfechadosSinLigar, delProveedor));
  return { cantidad: fila?.cantidad ?? 0, totalCentavos: aCentavos(fila?.total ?? '0') };
}

/** Los posfechados de apertura sin ligar de un proveedor, leídos de las tablas de Bancos. */
export class ConsultasDeChequesDeAperturaDrizzle implements ConsultasDeChequesDeApertura {
  sinLigarDe(proveedorId: string, hoy: string): Promise<ChequesDeAperturaSinLigar> {
    return chequesDeAperturaSinLigarDelProveedor(proveedorId, hoy);
  }
}
