import { asc, between, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { fechaIso } from '../../dominio/fecha-iso.js';
import type { AsuetoDto, Asuetos, NuevoAsueto } from '../../aplicacion/puertos/asuetos.js';
import { feriados } from './feriados.tablas.js';

const COLUMNAS = { id: feriados.id, fecha: feriados.fecha, nombre: feriados.nombre, origen: feriados.origen };

export class AsuetosDrizzle implements Asuetos {
  constructor(private readonly bd: BaseDatos) {}

  /** Sin RLS ni unidad de trabajo: la tabla es de toda la instalación y se lee a cada cálculo de días hábiles. */
  delAnio(anio: number): Promise<AsuetoDto[]> {
    return this.bd
      .select(COLUMNAS)
      .from(feriados)
      .where(between(feriados.fecha, fechaIso(anio, 1, 1), fechaIso(anio, 12, 31)))
      .orderBy(asc(feriados.fecha));
  }

  async buscarPorId(id: string): Promise<AsuetoDto | null> {
    const [fila] = await transaccionEnCurso().select(COLUMNAS).from(feriados).where(eq(feriados.id, id));
    return fila ?? null;
  }

  async agregar(nuevo: NuevoAsueto): Promise<AsuetoDto> {
    const [fila] = await transaccionEnCurso().insert(feriados).values(nuevo).returning(COLUMNAS);
    return fila!;
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(feriados).where(eq(feriados.id, id));
  }
}
