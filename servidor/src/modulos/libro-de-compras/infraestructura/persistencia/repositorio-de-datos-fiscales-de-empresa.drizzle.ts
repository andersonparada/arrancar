import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ModoDeBloqueoFiscal,
  RepositorioDeDatosFiscalesDeEmpresa,
} from '../../aplicacion/puertos/repositorios-de-datos-fiscales.js';
import { DatosFiscalesDeEmpresa, type PropiedadesFiscalesDeEmpresa } from '../../dominio/datos-fiscales-de-empresa.js';
import { HistorialFiscalDeEmpresa, type VigenciaFiscal } from '../../dominio/historial-fiscal-de-empresa.js';
import { datosFiscalesDeEmpresa as tabla } from './datos-fiscales.tablas.js';

type Fila = typeof tabla.$inferSelect;

function datosDeLaFila(fila: Fila): DatosFiscalesDeEmpresa {
  return DatosFiscalesDeEmpresa.crear({
    tipoDePersona: fila.tipoDePersona as PropiedadesFiscalesDeEmpresa['tipoDePersona'],
    regimenIva: fila.regimenIva as PropiedadesFiscalesDeEmpresa['regimenIva'],
    regimenIsr: fila.regimenIsr as PropiedadesFiscalesDeEmpresa['regimenIsr'],
    agenteDeRetencionIva: fila.agenteDeRetencionIva as PropiedadesFiscalesDeEmpresa['agenteDeRetencionIva'],
    esAgenteDeRetencionIsr: fila.esAgenteDeRetencionIsr,
  });
}

const cambioDeAutoria = () => ({ actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() });

/** Lo que se escribe de una vigencia: cuándo empieza y sus datos (la empresa y el id no cambian). */
const columnasDe = (vigencia: VigenciaFiscal) => ({
  vigenteDesde: vigencia.vigenteDesde,
  ...vigencia.datos.instantanea(),
});

/** El historial fiscal de la empresa en PostgreSQL; la seguridad por empresa la pone la transacción. */
export class RepositorioDeDatosFiscalesDeEmpresaDrizzle implements RepositorioDeDatosFiscalesDeEmpresa {
  async historial(empresaId: string): Promise<HistorialFiscalDeEmpresa> {
    const filas = await transaccionEnCurso().select().from(tabla).where(eq(tabla.empresaId, empresaId));
    return new HistorialFiscalDeEmpresa(
      filas.map((fila) => ({ id: fila.id, vigenteDesde: fila.vigenteDesde, datos: datosDeLaFila(fila) })),
    );
  }

  async vigenteEn(empresaId: string, periodo: string): Promise<DatosFiscalesDeEmpresa | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(tabla)
      .where(and(eq(tabla.empresaId, empresaId), or(isNull(tabla.vigenteDesde), lte(tabla.vigenteDesde, periodo))))
      .orderBy(sql`${tabla.vigenteDesde} desc nulls last`)
      .limit(1);
    return fila ? datosDeLaFila(fila) : null;
  }

  async bloquear(empresaId: string, modo: ModoDeBloqueoFiscal): Promise<void> {
    await transaccionEnCurso()
      .select({ id: tabla.id })
      .from(tabla)
      .where(eq(tabla.empresaId, empresaId))
      .for(modo === 'actualizar' ? 'update' : 'share');
  }

  async insertar(empresaId: string, vigencia: VigenciaFiscal): Promise<void> {
    await transaccionEnCurso()
      .insert(tabla)
      .values({ empresaId, ...columnasDe(vigencia) });
  }

  async actualizar(vigencia: VigenciaFiscal): Promise<void> {
    await transaccionEnCurso()
      .update(tabla)
      .set({ ...columnasDe(vigencia), ...cambioDeAutoria() })
      .where(eq(tabla.id, vigencia.id!));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(tabla).where(eq(tabla.id, id));
  }
}
