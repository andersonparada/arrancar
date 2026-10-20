import { and, asc, eq, getTableColumns, gte, lt, max, ne, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type {
  DeclaracionGuardada,
  DeclaracionNueva,
  FilaDePeriodo,
  RepositorioDePeriodos,
} from '../../aplicacion/puertos/puertos-de-periodos.js';
import type { FotoDelPeriodo } from '../../dominio/periodos/foto-del-periodo.js';
import { declaracionesDePeriodos as declaraciones, periodos } from './periodos.tablas.js';

const nombre = (id: string | null, nombres: string | null, apellidos: string | null) =>
  id ? { id, nombre: `${nombres ?? ''} ${apellidos ?? ''}`.trim() } : null;

const aFila = (fila: {
  periodo: string;
  estado: 'abierto' | 'declarado';
  declaradoEn: Date | null;
  id: string | null;
  nombres: string | null;
  apellidos: string | null;
}): FilaDePeriodo => ({
  periodo: fila.periodo,
  estado: fila.estado,
  declaradoEn: fila.declaradoEn,
  declaradoPor: nombre(fila.id, fila.nombres, fila.apellidos),
});

type FilaConAutor = typeof declaraciones.$inferSelect & {
  id_: string | null;
  nombres: string | null;
  apellidos: string | null;
};

const aDeclaracion = (fila: FilaConAutor): DeclaracionGuardada => ({
  id: fila.id,
  periodo: fila.periodo,
  secuencia: fila.secuencia,
  evento: fila.evento,
  formulario: fila.formulario,
  numeroDeFormulario: fila.numeroDeFormulario,
  fechaDePresentacion: fila.fechaDePresentacion,
  tipoDeLibro: fila.tipoDeLibro,
  foto: fila.foto as FotoDelPeriodo | null,
  diferencia: fila.diferencia,
  motivo: fila.motivo,
  creadoEn: fila.creadoEn,
  creadoPor: nombre(fila.id_, fila.nombres, fila.apellidos),
});

/** Los períodos de la empresa activa y su historial de solo agregar; la seguridad por empresa (RLS) limita lo que se ve. */
export class RepositorioDePeriodosDrizzle implements RepositorioDePeriodos {
  async bloquear(empresaId: string, periodo: string): Promise<FilaDePeriodo> {
    const transaccion = transaccionEnCurso();
    await transaccion.insert(periodos).values({ empresaId, periodo }).onConflictDoNothing();
    await transaccion
      .select({ periodo: periodos.periodo })
      .from(periodos)
      .where(and(eq(periodos.empresaId, empresaId), eq(periodos.periodo, periodo)))
      .for('update');
    const [fila] = await this.consultaDeFilas().where(
      and(eq(periodos.empresaId, empresaId), eq(periodos.periodo, periodo)),
    );
    return aFila(fila!);
  }

  async buscar(periodo: string): Promise<FilaDePeriodo | null> {
    const [fila] = await this.consultaDeFilas().where(eq(periodos.periodo, periodo));
    return fila ? aFila(fila) : null;
  }

  async marcarDeclarado(empresaId: string, periodo: string, declaradoPor: string): Promise<void> {
    await transaccionEnCurso()
      .update(periodos)
      .set({ estado: 'declarado', declaradoEn: sql`clock_timestamp()`, declaradoPor })
      .where(and(eq(periodos.empresaId, empresaId), eq(periodos.periodo, periodo)));
  }

  async reabrir(empresaId: string, periodo: string): Promise<void> {
    await transaccionEnCurso()
      .update(periodos)
      .set({ estado: 'abierto', declaradoEn: null, declaradoPor: null })
      .where(and(eq(periodos.empresaId, empresaId), eq(periodos.periodo, periodo)));
  }

  async agregarDeclaracion(empresaId: string, declaracion: DeclaracionNueva): Promise<DeclaracionGuardada> {
    const transaccion = transaccionEnCurso();
    const [ultima] = await transaccion
      .select({ secuencia: max(declaraciones.secuencia) })
      .from(declaraciones)
      .where(and(eq(declaraciones.empresaId, empresaId), eq(declaraciones.periodo, declaracion.periodo)));
    const [fila] = await transaccion
      .insert(declaraciones)
      .values({
        ...declaracion,
        empresaId,
        secuencia: (ultima?.secuencia ?? 0) + 1,
        // La hora real, no la del inicio de la transacción: los cambios «posteriores» se miden contra ella.
        creadoEn: sql`clock_timestamp()`,
      })
      .returning({ id: declaraciones.id });
    return (await this.historial(declaracion.periodo)).find((guardada) => guardada.id === fila!.id)!;
  }

  async historial(periodo: string): Promise<DeclaracionGuardada[]> {
    const filas = await this.consultaDeDeclaraciones()
      .where(eq(declaraciones.periodo, periodo))
      .orderBy(asc(declaraciones.secuencia));
    return filas.map(aDeclaracion);
  }

  async filasDelAnio(anio: number): Promise<FilaDePeriodo[]> {
    const filas = await this.consultaDeFilas()
      .where(and(gte(periodos.periodo, `${anio}-01-01`), lt(periodos.periodo, `${anio + 1}-01-01`)))
      .orderBy(asc(periodos.periodo));
    return filas.map(aFila);
  }

  async ultimasDelAnio(anio: number): Promise<DeclaracionGuardada[]> {
    const filas = await this.consultaDeDeclaraciones()
      .where(
        and(
          gte(declaraciones.periodo, `${anio}-01-01`),
          lt(declaraciones.periodo, `${anio + 1}-01-01`),
          ne(declaraciones.evento, 'reapertura'),
        ),
      )
      .orderBy(asc(declaraciones.periodo), asc(declaraciones.secuencia));
    const ultimas = new Map(filas.map((fila) => [fila.periodo, aDeclaracion(fila)]));
    return [...ultimas.values()];
  }

  private consultaDeFilas() {
    return transaccionEnCurso()
      .select({
        periodo: periodos.periodo,
        estado: periodos.estado,
        declaradoEn: periodos.declaradoEn,
        id: usuarios.id,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
      })
      .from(periodos)
      .leftJoin(usuarios, eq(usuarios.id, periodos.declaradoPor));
  }

  private consultaDeDeclaraciones() {
    return transaccionEnCurso()
      .select({
        ...getTableColumns(declaraciones),
        id_: usuarios.id,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
      })
      .from(declaraciones)
      .leftJoin(usuarios, eq(usuarios.id, declaraciones.creadoPor));
  }
}
