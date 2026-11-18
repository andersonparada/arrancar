import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { datosFiscalesDeEmpresa } from '../../../libro-de-compras/infraestructura/persistencia/datos-fiscales.tablas.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { retenciones } from '../../../libro-de-compras/infraestructura/persistencia/retenciones.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type {
  DatosFiscalesDeLaEmpresa,
  NombreDelNit,
  RetencionesDelLibro,
} from '../../aplicacion/puertos/puertos-de-pagos.js';
import type { RetencionDelLibro } from '../../dominio/avisos-de-pagos.js';
import type { EfectoFiscal } from '../../dominio/bancarizacion-de-pagos.js';
import { nombreDelNit } from '../../dominio/nombre-del-nit.js';
import { documentos } from './documentos.tablas.js';

/** Las retenciones que Libro de compras fijó a cada cargo (solo lectura; las tablas tienen RLS por empresa). */
export class RetencionesDelLibroDrizzle implements RetencionesDelLibro {
  async deCargos(cargoIds: readonly string[]): Promise<Map<string, RetencionDelLibro[]>> {
    const porCargo = new Map<string, RetencionDelLibro[]>();
    if (cargoIds.length === 0) return porCargo;
    const filas = await transaccionEnCurso()
      .select({
        cargoId: documentos.id,
        impuesto: retenciones.impuesto,
        monto: retenciones.monto,
        fecha: retenciones.fecha,
        constanciaNumero: retenciones.constanciaNumero,
      })
      .from(retenciones)
      .innerJoin(documentos, eq(documentos.documentoId, retenciones.documentoId))
      .where(and(inArray(documentos.id, [...cargoIds]), gt(retenciones.monto, '0')));
    for (const { cargoId, monto, ...resto } of filas) {
      porCargo.set(cargoId, [...(porCargo.get(cargoId) ?? []), { ...resto, montoCentavos: aCentavos(monto) }]);
    }
    return porCargo;
  }
}

/** El nombre del NIT: el de Terceros y, si falta, el `nombre_emisor` del DTE más reciente de los cargos. */
export class NombreDelNitDrizzle implements NombreDelNit {
  async de(proveedorId: string, cargoIds: readonly string[]): Promise<string | null> {
    const [tercero] = await transaccionEnCurso()
      .select({
        tipoDePersona: terceros.tipo,
        razonSocial: terceros.razonSocial,
        nombres: terceros.nombres,
        apellidos: terceros.apellidos,
      })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(eq(proveedores.id, proveedorId));
    if (!tercero) return null;
    return nombreDelNit({
      ...tercero,
      tipoDePersona: tercero.tipoDePersona === 'individual' ? 'individual' : 'juridica',
      nombreDelDte: await this.nombreDelDte(cargoIds),
    });
  }

  private async nombreDelDte(cargoIds: readonly string[]): Promise<string | null> {
    if (cargoIds.length === 0) return null;
    const [fila] = await transaccionEnCurso()
      .select({ nombre: documentosDeCompra.nombreEmisor })
      .from(documentos)
      .innerJoin(documentosDeCompra, eq(documentosDeCompra.id, documentos.documentoId))
      .where(inArray(documentos.id, [...cargoIds]))
      .orderBy(desc(documentosDeCompra.fechaEmision), desc(documentosDeCompra.creadoEn))
      .limit(1);
    return fila?.nombre ?? null;
  }
}

type Vigencia = typeof datosFiscalesDeEmpresa.$inferSelect;

/** La vigencia que rige en la fecha: la de `vigente_desde` más reciente que no la pase (nula es «desde el inicio»). */
function vigenteEn(vigencias: readonly Vigencia[], fecha: string): Vigencia | null {
  const rigen = vigencias.filter(({ vigenteDesde }) => vigenteDesde === null || vigenteDesde <= fecha);
  return rigen.sort((a, b) => (b.vigenteDesde ?? '').localeCompare(a.vigenteDesde ?? ''))[0] ?? null;
}

interface CargoConSuLibro {
  id: string;
  /** Lo del documento del libro; todo nulo en un saldo inicial. */
  libro: { regimenIva: string; iva: string; ivaNoAcreditable: string; periodo: string } | null;
}

/** Un documento del libro da crédito fiscal si la empresa era del régimen general y le quedó IVA acreditable. */
const daCreditoElDocumento = ({ regimenIva, iva, ivaNoAcreditable }: NonNullable<CargoConSuLibro['libro']>): boolean =>
  regimenIva === 'general' && aCentavos(iva) - aCentavos(ivaNoAcreditable) > 0;

/** Lo que pierde un cargo sin bancarización; `null` si falta el dato fiscal de la empresa para saberlo. */
function efectoDeUnCargo(
  { libro }: CargoConSuLibro,
  vigencias: readonly Vigencia[],
  fechaDeInicio: string | null,
): EfectoFiscal | null {
  const fecha = libro?.periodo ?? fechaDeInicio;
  const vigencia = fecha === null ? null : vigenteEn(vigencias, fecha);
  const isr = vigencia?.regimenIsr === 'utilidades';
  if (libro) return { iva: daCreditoElDocumento(libro), isr };
  return vigencia === null ? null : { iva: vigencia.regimenIva === 'general', isr };
}

/**
 * Qué perdería cada cargo sin bancarización. El IVA solo da crédito en el régimen general y el ISR solo deduce con ISR sobre
 * utilidades: son los mismos criterios de `DatosFiscalesDeEmpresa.daCreditoFiscal()` y `tieneIsrSobreUtilidades()` de Libro
 * de compras, que este módulo no puede importar (solo sus tablas). Un documento del libro usa el régimen de IVA que copió al
 * registrarse y el de ISR de la empresa en su período; un saldo inicial, el de la fecha de inicio.
 */
export class DatosFiscalesDeLaEmpresaDrizzle implements DatosFiscalesDeLaEmpresa {
  async efectoDe(cargoIds: readonly string[], fechaDeInicio: string | null): Promise<Map<string, EfectoFiscal>> {
    const efectos = new Map<string, EfectoFiscal>();
    if (cargoIds.length === 0) return efectos;
    const vigencias = await transaccionEnCurso().select().from(datosFiscalesDeEmpresa);
    for (const cargo of await this.cargosConSuLibro(cargoIds)) {
      const efecto = efectoDeUnCargo(cargo, vigencias, fechaDeInicio);
      if (efecto) efectos.set(cargo.id, efecto);
    }
    return efectos;
  }

  async efectoDeLaEmpresa(fecha: string): Promise<EfectoFiscal | null> {
    const vigencia = vigenteEn(await transaccionEnCurso().select().from(datosFiscalesDeEmpresa), fecha);
    if (vigencia === null) return null;
    return { iva: vigencia.regimenIva === 'general', isr: vigencia.regimenIsr === 'utilidades' };
  }

  private async cargosConSuLibro(cargoIds: readonly string[]): Promise<CargoConSuLibro[]> {
    const propios = await transaccionEnCurso()
      .select({ id: documentos.id, documentoId: documentos.documentoId })
      .from(documentos)
      .where(inArray(documentos.id, [...cargoIds]));
    const idsDelLibro = propios.flatMap(({ documentoId }) => documentoId ?? []);
    const filas =
      idsDelLibro.length === 0
        ? []
        : await transaccionEnCurso()
            .select({
              id: documentosDeCompra.id,
              regimenIva: documentosDeCompra.regimenIvaDeLaEmpresa,
              iva: documentosDeCompra.iva,
              ivaNoAcreditable: documentosDeCompra.ivaNoAcreditable,
              periodo: documentosDeCompra.periodo,
            })
            .from(documentosDeCompra)
            .where(inArray(documentosDeCompra.id, idsDelLibro));
    const porId = new Map(filas.map((fila) => [fila.id, fila]));
    return propios.map(({ id, documentoId }) => ({ id, libro: (documentoId && porId.get(documentoId)) || null }));
  }
}
