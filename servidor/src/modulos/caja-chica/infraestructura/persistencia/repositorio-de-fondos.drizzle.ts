import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import type {
  AnulacionDelCambio,
  CambioConSuFondo,
  CambioNuevo,
  CambiosDelFondo,
  CierreDelFondo,
  CustodioNuevo,
  FondoNuevo,
  RepositorioDeFondos,
} from '../../aplicacion/puertos/puertos-de-fondos.js';
import type { CambioDeMonto, CustodioDelFondo, Fondo } from '../../dominio/fondos.js';
import { cambiosDeMonto } from './cambios-de-monto.tablas.js';
import { custodiosDeFondos } from './custodios-de-fondos.tablas.js';
import { fondos } from './fondos.tablas.js';

/** La fila de la base como el fondo del dominio. */
export const aFondo = (fila: typeof fondos.$inferSelect): Fondo => ({
  id: fila.id,
  nombre: fila.nombre,
  localidadId: fila.localidadId,
  topeCentavos: fila.topePorComprobante === null ? null : aCentavos(fila.topePorComprobante),
  cuentaBancariaId: fila.cuentaBancariaId,
  origen: fila.origen,
  fechaDeApertura: fila.fechaDeApertura,
  estado: fila.estado,
  fechaDeCierre: fila.fechaDeCierre,
  motivoDeCierre: fila.motivoDeCierre,
  observaciones: fila.observaciones,
});

const aCambio = (fila: typeof cambiosDeMonto.$inferSelect): CambioDeMonto => ({
  id: fila.id,
  tipo: fila.tipo,
  forma: fila.forma,
  fecha: fila.fecha,
  montoCentavos: aCentavos(fila.monto),
  movimientoId: fila.movimientoId,
  estado: fila.estado,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  motivoDeAnulacion: fila.motivoDeAnulacion,
});

const aCustodio = (fila: typeof custodiosDeFondos.$inferSelect): CustodioDelFondo => ({
  id: fila.id,
  custodio: fila.custodio,
  custodioUsuarioId: fila.custodioUsuarioId,
  desde: fila.desde,
  hasta: fila.hasta,
  motivoDelCambio: fila.motivoDelCambio,
});

const textoDelTope = (centavos: number | null): string | null => (centavos === null ? null : deCentavos(centavos));

/** Las tablas tienen seguridad por empresa y, las de un fondo, por el alcance de fondos (RLS). */
export class RepositorioDeFondosDrizzle implements RepositorioDeFondos {
  async agregar({ topeCentavos, fechaDeApertura, ...fondo }: FondoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(fondos)
      .values({ ...fondo, empresaId, fechaDeApertura, topePorComprobante: textoDelTope(topeCentavos) });
  }

  async buscar(id: string): Promise<Fondo | null> {
    const [fila] = await transaccionEnCurso().select().from(fondos).where(eq(fondos.id, id));
    return fila ? aFondo(fila) : null;
  }

  async bloquear(id: string): Promise<Fondo | null> {
    const [fila] = await transaccionEnCurso().select().from(fondos).where(eq(fondos.id, id)).for('update');
    return fila ? aFondo(fila) : null;
  }

  async actualizar(id: string, { topeCentavos, ...cambios }: CambiosDelFondo): Promise<void> {
    const { nombre, localidadId, cuentaBancariaId } = cambios;
    const valores = {
      ...(nombre !== undefined && { nombre }),
      ...(localidadId !== undefined && { localidadId }),
      ...(cuentaBancariaId !== undefined && { cuentaBancariaId }),
      ...(topeCentavos !== undefined && { topePorComprobante: textoDelTope(topeCentavos) }),
    };
    if (Object.keys(valores).length === 0) return;
    await transaccionEnCurso().update(fondos).set(valores).where(eq(fondos.id, id));
  }

  async cerrar(id: string, { fecha, cerradoPor, motivo }: CierreDelFondo): Promise<void> {
    await transaccionEnCurso()
      .update(fondos)
      .set({ estado: 'cerrado', fechaDeCierre: fecha, cerradoEn: sql`now()`, cerradoPor, motivoDeCierre: motivo })
      .where(eq(fondos.id, id));
  }

  async existeElNombre(nombre: string, exceptoId?: string): Promise<boolean> {
    const mismoNombre = sql`${nombreNormalizado(fondos.nombre)} = core.nombre_normalizado(${nombre})`;
    const filtro = exceptoId ? and(mismoNombre, sql`${fondos.id} <> ${exceptoId}`) : mismoNombre;
    const [fila] = await transaccionEnCurso().select({ id: fondos.id }).from(fondos).where(filtro).limit(1);
    return fila !== undefined;
  }

  async agregarCustodio(custodio: CustodioNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(custodiosDeFondos)
      .values({ ...custodio, empresaId });
  }

  async cerrarCustodioVigente(fondoId: string, hasta: string): Promise<void> {
    await transaccionEnCurso()
      .update(custodiosDeFondos)
      .set({ hasta })
      .where(and(eq(custodiosDeFondos.fondoId, fondoId), isNull(custodiosDeFondos.hasta)));
  }

  async custodios(fondoId: string): Promise<CustodioDelFondo[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(custodiosDeFondos)
      .where(eq(custodiosDeFondos.fondoId, fondoId))
      .orderBy(asc(custodiosDeFondos.desde), asc(custodiosDeFondos.creadoEn));
    return filas.map(aCustodio);
  }

  async agregarCambio({ montoCentavos, ...cambio }: CambioNuevo): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .insert(cambiosDeMonto)
      .values({ ...cambio, empresaId, monto: deCentavos(montoCentavos) })
      .returning({ id: cambiosDeMonto.id });
    return fila!.id;
  }

  async cambios(fondoId: string): Promise<CambioDeMonto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(cambiosDeMonto)
      .where(eq(cambiosDeMonto.fondoId, fondoId))
      .orderBy(asc(cambiosDeMonto.fecha), asc(cambiosDeMonto.creadoEn));
    return filas.map(aCambio);
  }

  async anularCambio(cambioId: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDelCambio): Promise<void> {
    await transaccionEnCurso()
      .update(cambiosDeMonto)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(cambiosDeMonto.id, cambioId));
  }

  async cambioDelMovimiento(movimientoId: string): Promise<CambioConSuFondo | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(cambiosDeMonto)
      .where(eq(cambiosDeMonto.movimientoId, movimientoId));
    return fila ? { fondoId: fila.fondoId, cambio: aCambio(fila) } : null;
  }
}
