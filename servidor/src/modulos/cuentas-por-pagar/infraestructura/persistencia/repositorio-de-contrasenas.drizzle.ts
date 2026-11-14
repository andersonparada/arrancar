import { and, eq, inArray } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
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
    const transaccion = transaccionEnCurso();
    const [fila] = await transaccion
      .insert(contrasenas)
      .values({ empresaId, ...datos })
      .returning({ id: contrasenas.id });
    const contrasenaId = fila!.id;
    await transaccion
      .insert(contrasenaDocumentos)
      .values(
        documentoIds.map((documentoId) => ({ empresaId, proveedorId: nueva.proveedorId, contrasenaId, documentoId })),
      );
    return contrasenaId;
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
