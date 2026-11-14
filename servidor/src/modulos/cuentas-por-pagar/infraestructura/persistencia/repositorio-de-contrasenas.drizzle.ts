import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeContrasena,
  CambiosDeContrasena,
  ContrasenaDelDocumento,
  ContrasenaNueva,
  RepositorioDeContrasenas,
} from '../../aplicacion/puertos/puertos-de-contrasenas.js';
import { numeroDeContrasena } from '../../dominio/contrasena.js';
import type { AplicacionDeContrasena } from '../../dominio/reparto-de-contrasena.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS). */
export class RepositorioDeContrasenasDrizzle implements RepositorioDeContrasenas {
  async agregar(nueva: ContrasenaNueva): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const { documentoIds, ...datos } = nueva;
    const [fila] = await transaccionEnCurso()
      .insert(contrasenas)
      .values({ empresaId, ...datos })
      .returning({ id: contrasenas.id });
    await this.agregarDocumentos(fila!.id, nueva.proveedorId, documentoIds);
    return fila!.id;
  }

  async agregarDocumentos(contrasenaId: string, proveedorId: string, documentoIds: readonly string[]): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(contrasenaDocumentos)
      .values(documentoIds.map((documentoId) => ({ empresaId, proveedorId, contrasenaId, documentoId })));
  }

  async quitarDocumento(contrasenaId: string, documentoId: string): Promise<void> {
    await transaccionEnCurso()
      .delete(contrasenaDocumentos)
      .where(
        and(eq(contrasenaDocumentos.contrasenaId, contrasenaId), eq(contrasenaDocumentos.documentoId, documentoId)),
      );
  }

  async bloquear(contrasenaId: string): Promise<void> {
    await transaccionEnCurso()
      .select({ id: contrasenas.id })
      .from(contrasenas)
      .where(eq(contrasenas.id, contrasenaId))
      .for('update');
  }

  async actualizar(contrasenaId: string, cambios: CambiosDeContrasena): Promise<void> {
    await transaccionEnCurso().update(contrasenas).set(cambios).where(eq(contrasenas.id, contrasenaId));
  }

  async anular(contrasenaId: string, { anuladaPor, motivo }: AnulacionDeContrasena): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion
      .update(contrasenaDocumentos)
      .set({ vigente: false })
      .where(eq(contrasenaDocumentos.contrasenaId, contrasenaId));
    await transaccion
      .update(contrasenas)
      .set({ estado: 'anulada', anuladaEn: new Date(), anuladaPor, motivoDeAnulacion: motivo })
      .where(eq(contrasenas.id, contrasenaId));
  }

  async marcarImpresion(contrasenaId: string): Promise<boolean> {
    const marcadas = await transaccionEnCurso()
      .update(contrasenas)
      .set({ impresaEn: sql`now()` })
      .where(and(eq(contrasenas.id, contrasenaId), isNull(contrasenas.impresaEn)))
      .returning({ id: contrasenas.id });
    return marcadas.length === 1;
  }

  async borrarReparto(contrasenaId: string): Promise<void> {
    await transaccionEnCurso()
      .delete(aplicacionesDeNotas)
      .where(and(eq(aplicacionesDeNotas.contrasenaId, contrasenaId), eq(aplicacionesDeNotas.forma, 'contrasena')));
  }

  async guardarReparto(
    contrasenaId: string,
    proveedorId: string,
    aplicaciones: readonly AplicacionDeContrasena[],
  ): Promise<void> {
    if (aplicaciones.length === 0) return;
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(aplicacionesDeNotas)
      .values(
        aplicaciones.map(({ notaId, cargoId, montoCentavos, fecha }) => ({
          empresaId,
          proveedorId,
          notaId,
          cargoId,
          monto: deCentavos(montoCentavos),
          forma: 'contrasena',
          fecha,
          contrasenaId,
        })),
      );
  }

  async vigentesDe(documentoIds: readonly string[]): Promise<Map<string, ContrasenaDelDocumento>> {
    if (documentoIds.length === 0) return new Map();
    const filas = await transaccionEnCurso()
      .select({
        documentoId: contrasenaDocumentos.documentoId,
        id: contrasenas.id,
        numero: contrasenas.numero,
        anioDeNumero: contrasenas.anioDeNumero,
      })
      .from(contrasenaDocumentos)
      .innerJoin(contrasenas, eq(contrasenas.id, contrasenaDocumentos.contrasenaId))
      .where(and(inArray(contrasenaDocumentos.documentoId, [...documentoIds]), eq(contrasenaDocumentos.vigente, true)));
    return new Map(
      filas.map(({ documentoId, id, numero, anioDeNumero }) => [
        documentoId,
        { id, numero: numeroDeContrasena(numero, anioDeNumero) },
      ]),
    );
  }
}
