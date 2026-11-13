import { aliasedTable, asc, eq, type SQL } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DatosDeAplicacion, RepositorioDeAplicaciones } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { AplicacionDeNota, DocumentoPorPagar, FormaDeAplicacion } from '../../dominio/documento-por-pagar.js';
import type { AplicacionACargo } from '../../dominio/reparto-de-nota-de-credito.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { documentos } from './documentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS). */
export class RepositorioDeAplicacionesDrizzle implements RepositorioDeAplicaciones {
  async agregar(
    nota: DocumentoPorPagar,
    aplicaciones: readonly AplicacionACargo[],
    { forma, fecha, referencia }: DatosDeAplicacion,
  ): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(aplicacionesDeNotas)
      .values(
        aplicaciones.map(({ cargoId, montoCentavos }) => ({
          empresaId,
          proveedorId: nota.proveedorId,
          notaId: nota.id,
          cargoId,
          monto: deCentavos(montoCentavos),
          forma,
          fecha,
          referencia,
        })),
      );
  }

  hechasPorLaNota(notaId: string): Promise<AplicacionDeNota[]> {
    return this.deLa(eq(aplicacionesDeNotas.notaId, notaId), 'cargo');
  }

  recibidasPorElCargo(cargoId: string): Promise<AplicacionDeNota[]> {
    return this.deLa(eq(aplicacionesDeNotas.cargoId, cargoId), 'nota');
  }

  async borrarDeLaNota(notaId: string): Promise<void> {
    await transaccionEnCurso().delete(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.notaId, notaId));
  }

  async borrarDelCargo(cargoId: string): Promise<void> {
    await transaccionEnCurso().delete(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.cargoId, cargoId));
  }

  /** Con la serie y el número del otro documento: el cargo de lo que hizo una nota, la nota de lo que recibió un cargo. */
  private async deLa(condicion: SQL, otro: 'cargo' | 'nota'): Promise<AplicacionDeNota[]> {
    const otroDocumento = aliasedTable(documentos, 'otro');
    const filas = await transaccionEnCurso()
      .select({ aplicacion: aplicacionesDeNotas, serie: otroDocumento.serie, numero: otroDocumento.numero })
      .from(aplicacionesDeNotas)
      .innerJoin(
        otroDocumento,
        eq(otroDocumento.id, otro === 'cargo' ? aplicacionesDeNotas.cargoId : aplicacionesDeNotas.notaId),
      )
      .where(condicion)
      .orderBy(asc(aplicacionesDeNotas.creadoEn));
    return filas.map(({ aplicacion: a, serie, numero }) => ({
      id: a.id,
      notaId: a.notaId,
      cargoId: a.cargoId,
      montoCentavos: aCentavos(a.monto),
      forma: a.forma as FormaDeAplicacion,
      fecha: a.fecha,
      referencia: a.referencia,
      otraSerie: serie,
      otroNumero: numero,
    }));
  }
}
