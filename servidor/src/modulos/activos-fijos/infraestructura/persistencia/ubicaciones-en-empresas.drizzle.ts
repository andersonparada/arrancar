import { sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { UbicacionesDto } from '../../aplicacion/dto/activo.dto.js';
import type {
  DepartamentoVisible,
  LectorDeUbicaciones,
  LocalidadVisible,
} from '../../aplicacion/puertos/lector-de-ubicaciones.js';

type FilaDeLocalidad = { id: string; codigo: string; nombre: string; activo: boolean };

type FilaDeDepartamento = FilaDeLocalidad & { localidad_id: string | null };

/**
 * Lee los nombres de las localidades y departamentos con las funciones `empresas.nombres_de_localidades` y
 * `empresas.nombres_de_departamentos` (AF-P22 b, para revisión de seguridad): corren con la empresa de la transacción
 * y no aplican el alcance de localidades de Empresas. Solo se usan en rutas con permiso de Activos fijos.
 */
export class UbicacionesEnEmpresas implements LectorDeUbicaciones {
  async localidad(id: string): Promise<LocalidadVisible | null> {
    const [fila] = await this.localidades([id]);
    return fila ?? null;
  }

  async departamento(id: string): Promise<DepartamentoVisible | null> {
    const [fila] = await this.departamentos([id]);
    return fila ?? null;
  }

  async activas(): Promise<UbicacionesDto> {
    const [localidades, departamentos] = await Promise.all([this.localidades(null), this.departamentos(null)]);
    const activa = <T extends { activo: boolean }>(fila: T) => fila.activo;
    return {
      localidades: localidades.filter(activa).map(({ id, codigo, nombre }) => ({ id, codigo, nombre })),
      departamentos: departamentos.filter(activa).map(({ activo: _activo, ...resto }) => resto),
    };
  }

  /** Las de los ids dados; sin ids, todas las de la empresa. */
  async localidades(ids: readonly string[] | null): Promise<LocalidadVisible[]> {
    const { rows } = await transaccionEnCurso().execute<FilaDeLocalidad>(
      sql`select id, codigo, nombre, activo from empresas.nombres_de_localidades(${aArreglo(ids)}::uuid[])`,
    );
    return rows;
  }

  async departamentos(ids: readonly string[] | null): Promise<DepartamentoVisible[]> {
    const { rows } = await transaccionEnCurso().execute<FilaDeDepartamento>(
      sql`select id, codigo, nombre, localidad_id, activo from empresas.nombres_de_departamentos(${aArreglo(ids)}::uuid[])`,
    );
    return rows.map(({ localidad_id: localidadId, ...resto }) => ({ ...resto, localidadId }));
  }
}

/** Un arreglo de uuid para la función; sin ids, nulo (todas). */
function aArreglo(ids: readonly string[] | null) {
  return ids
    ? sql`array[${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )}]`
    : sql`null`;
}
