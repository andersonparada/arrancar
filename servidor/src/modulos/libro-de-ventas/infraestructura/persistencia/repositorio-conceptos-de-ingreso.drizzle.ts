import { and, eq, isNull, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioConceptosDeIngreso } from '../../aplicacion/puertos/repositorio-conceptos-de-ingreso.js';
import type { ConceptoDeIngreso, ConceptoDeIngresoId } from '../../dominio/concepto-de-ingreso.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { mapeadorDeConceptoDeIngreso } from './concepto-de-ingreso.mapeador.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioConceptosDeIngresoDrizzle implements RepositorioConceptosDeIngreso {
  async buscar(id: ConceptoDeIngresoId): Promise<ConceptoDeIngreso | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(conceptosDeIngreso)
      .where(eq(conceptosDeIngreso.id, id.valor));
    return fila ? mapeadorDeConceptoDeIngreso.aEntidad(fila) : null;
  }

  async agregar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void> {
    await transaccionEnCurso().insert(conceptosDeIngreso).values(mapeadorDeConceptoDeIngreso.aFila(conceptoDeIngreso));
  }

  async guardar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void> {
    await transaccionEnCurso()
      .update(conceptosDeIngreso)
      .set(mapeadorDeConceptoDeIngreso.aFila(conceptoDeIngreso))
      .where(eq(conceptosDeIngreso.id, conceptoDeIngreso.id.valor));
  }

  async eliminar(conceptoDeIngreso: ConceptoDeIngreso): Promise<void> {
    await transaccionEnCurso().delete(conceptosDeIngreso).where(eq(conceptosDeIngreso.id, conceptoDeIngreso.id.valor));
  }

  /** Un concepto con líneas de documentos (también de documentos anulados) se inactiva en vez de eliminarse. */
  async enUso(id: ConceptoDeIngresoId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: lineasDeDocumento.id })
      .from(lineasDeDocumento)
      .where(eq(lineasDeDocumento.conceptoDeIngresoId, id.valor))
      .limit(1);
    return fila !== undefined;
  }

  async hayAlguno(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: conceptosDeIngreso.id }).from(conceptosDeIngreso).limit(1);
    return fila !== undefined;
  }

  async sembrar(nuevos: readonly ConceptoDeIngreso[]): Promise<void> {
    if (nuevos.length === 0) return;
    const filas = nuevos.map((concepto) => mapeadorDeConceptoDeIngreso.aFila(concepto));
    await transaccionEnCurso().insert(conceptosDeIngreso).values(filas).onConflictDoNothing();
  }

  async asegurarDeSistema(conceptoDeSistema: ConceptoDeIngreso): Promise<void> {
    const { claveDeSistema, nombre } = conceptoDeSistema.instantanea();
    const tx = transaccionEnCurso();
    const [existente] = await tx
      .select({ id: conceptosDeIngreso.id })
      .from(conceptosDeIngreso)
      .where(eq(conceptosDeIngreso.claveDeSistema, claveDeSistema!));
    if (existente) return;
    await tx
      .update(conceptosDeIngreso)
      .set({ nombre: sql`left(${conceptosDeIngreso.nombre}, 70) || ' (manual)'` })
      .where(
        and(
          isNull(conceptosDeIngreso.claveDeSistema),
          sql`${nombreNormalizado(conceptosDeIngreso.nombre)} = core.nombre_normalizado(${nombre})`,
        ),
      );
    await this.sembrar([conceptoDeSistema]);
  }
}
