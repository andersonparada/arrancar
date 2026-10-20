import { and, asc, eq, gt, gte, lte, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { ConsultasDeEnteros, RepositorioDeEnteros } from '../../aplicacion/puertos/puertos-de-retenciones.js';
import type { EnteroGuardado } from '../../dominio/retenciones/retencion-del-reporte.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import { documentos } from './documentos.tablas.js';
import { enterosDeRetenciones as enteros } from './enteros-de-retenciones.tablas.js';
import { enteroGuardado } from './retencion-del-reporte.mapeador.js';
import { retenciones } from './retenciones.tablas.js';

const columnas = { entero: enteros, nombres: usuarios.nombres, apellidos: usuarios.apellidos };

const consultaBase = () =>
  transaccionEnCurso().select(columnas).from(enteros).leftJoin(usuarios, eq(usuarios.id, enteros.creadoPor));

/** Los pagos de las retenciones; la tabla tiene seguridad por empresa (RLS). */
export class ConsultasDeEnterosDrizzle implements ConsultasDeEnteros {
  async delRango(desde: string, hasta: string): Promise<EnteroGuardado[]> {
    const filas = await consultaBase()
      .where(and(gte(enteros.mes, desde), lte(enteros.mes, hasta)))
      .orderBy(asc(enteros.mes), asc(enteros.grupo), asc(enteros.creadoEn), asc(enteros.id));
    return filas.map(enteroGuardado);
  }

  async buscar(id: string, bloquear: boolean): Promise<EnteroGuardado | null> {
    if (bloquear) {
      await transaccionEnCurso().select({ id: enteros.id }).from(enteros).where(eq(enteros.id, id)).for('update');
    }
    const [fila] = await consultaBase().where(eq(enteros.id, id));
    return fila ? enteroGuardado(fila) : null;
  }

  async retenidoDelRango(desde: string, hasta: string) {
    const mes = sql<string>`to_char(date_trunc('month', ${retenciones.fecha}), 'YYYY-MM-DD')`;
    const filas = await transaccionEnCurso()
      .select({ mes, regla: retenciones.regla, monto: sql<string>`sum(${retenciones.monto})` })
      .from(retenciones)
      .innerJoin(
        documentos,
        and(eq(documentos.id, retenciones.documentoId), eq(documentos.empresaId, retenciones.empresaId)),
      )
      .where(
        and(
          eq(documentos.estado, 'vigente'),
          gt(retenciones.monto, '0'),
          sql`${retenciones.fecha} >= ${desde}::date`,
          sql`${retenciones.fecha} < (${hasta}::date + interval '1 month')`,
        ),
      )
      .groupBy(mes, retenciones.regla);
    return filas.map((fila) => ({
      mes: fila.mes,
      regla: fila.regla as ReglaDeRetencion,
      monto: aCentavos(fila.monto),
    }));
  }
}

export class RepositorioDeEnterosDrizzle implements RepositorioDeEnteros {
  async crear(empresaId: string, datos: Parameters<RepositorioDeEnteros['crear']>[1]): Promise<string> {
    const [fila] = await transaccionEnCurso()
      .insert(enteros)
      .values({
        empresaId,
        mes: datos.mes,
        grupo: datos.grupo,
        fechaDePago: datos.fechaDePago,
        documentoDePago: datos.documentoDePago,
        monto: deCentavos(datos.monto),
        retenidoAlMarcar: deCentavos(datos.retenidoAlMarcar),
        observaciones: datos.observaciones,
      })
      .returning({ id: enteros.id });
    return fila!.id;
  }

  async corregir(id: string, datos: Parameters<RepositorioDeEnteros['corregir']>[1]): Promise<void> {
    await transaccionEnCurso()
      .update(enteros)
      .set({
        fechaDePago: datos.fechaDePago,
        documentoDePago: datos.documentoDePago,
        monto: deCentavos(datos.monto),
        observaciones: datos.observaciones,
      })
      .where(eq(enteros.id, id));
  }

  async anular(id: string, { anuladoPor, motivo }: { anuladoPor: string; motivo: string }): Promise<void> {
    await transaccionEnCurso()
      .update(enteros)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo })
      .where(eq(enteros.id, id));
  }
}
