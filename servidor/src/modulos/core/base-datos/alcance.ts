import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';
import { empresaDeLaTransaccion, politicaPorEmpresa, rolAplicacion, usuarioDeLaTransaccion } from './columnas.js';

/** Dónde guarda un módulo las asignaciones de un recurso con alcance. */
export interface AlcanceDeRegistros {
  /** Clave del recurso, igual a la de `recursosConAlcance`: `empresas.localidades`. */
  recurso: string;
  /** Tabla de accesos, con esquema: `empresas.accesos_a_localidades`. */
  tablaDeAccesos: string;
  /** Tabla protegida, con esquema: `empresas.localidades`. */
  tablaDelRegistro: string;
  /** Columna de la tabla de accesos con el id del registro: `localidad_id`. */
  columna: string;
}

const alcanceTotalDelRecurso = (recurso: string) =>
  `'${recurso}' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))`;

/** Los datos van dentro de SQL crudo: solo se aceptan nombres simples. */
function validar(alcance: AlcanceDeRegistros, columnaDeLaTabla?: string): void {
  const tabla = /^[a-z_]+(\.[a-z_]+)?$/;
  const validos =
    /^[a-z0-9_.-]+$/.test(alcance.recurso) &&
    tabla.test(alcance.tablaDeAccesos) &&
    tabla.test(alcance.tablaDelRegistro) &&
    /^[a-z_]+$/.test(alcance.columna) &&
    (columnaDeLaTabla === undefined || /^[a-z_]+$/.test(columnaDeLaTabla));
  if (!validos) throw new Error(`Alcance inválido para las políticas: ${alcance.recurso}`);
}

/** Condición: alcance total del recurso o registro asignado al usuario en la empresa activa. */
function condicionDeAlcance(alcance: AlcanceDeRegistros, columna: string): string {
  return `${alcanceTotalDelRecurso(alcance.recurso)}
    or ${columna} in (
      select a.${alcance.columna} from ${alcance.tablaDeAccesos} a
      where a.empresa_id = (select ${empresaDeLaTransaccion})
        and a.usuario_id = (select ${usuarioDeLaTransaccion})
    )`;
}

const nombreDePolitica = (alcance: AlcanceDeRegistros) => `alcance_${alcance.recurso.replace(/[.-]/g, '_')}`;

/**
 * Políticas restrictivas de la tabla protegida (p. ej. `empresas.localidades`): ver, cambiar
 * y eliminar solo lo asignado al usuario (o con alcance total). **No** hay política de
 * `insert`: el registro nuevo aún no está asignado a nadie; crear lo limitan el permiso de
 * la ruta y la RLS por empresa, y el disparador `core.asignar_registro_al_creador` lo asigna.
 */
export const politicasDelRegistroConAlcance = (alcance: AlcanceDeRegistros) => {
  validar(alcance);
  const condicion = sql.raw(condicionDeAlcance(alcance, 'id'));
  const base = { as: 'restrictive', to: rolAplicacion } as const;
  return [
    pgPolicy('alcance_ver', { ...base, for: 'select', using: condicion }),
    pgPolicy('alcance_cambiar', { ...base, for: 'update', using: condicion, withCheck: condicion }),
    pgPolicy('alcance_eliminar', { ...base, for: 'delete', using: condicion }),
  ];
};

function politicaSobreColumna(alcance: AlcanceDeRegistros, columna: string, opcional: boolean) {
  validar(alcance, columna);
  const condicion = condicionDeAlcance(alcance, columna);
  const texto = sql.raw(opcional ? `${columna} is null or ${condicion}` : condicion);
  return pgPolicy(nombreDePolitica(alcance), {
    as: 'restrictive',
    for: 'all',
    to: rolAplicacion,
    using: texto,
    withCheck: texto,
  });
}

/**
 * Política restrictiva de una tabla que **apunta** a un registro con alcance (bodegas,
 * ventas…): solo se ven y escriben filas cuyo `columna` sea un registro asignado al usuario.
 */
export const politicaPorAlcance = (alcance: AlcanceDeRegistros, columna: string) =>
  politicaSobreColumna(alcance, columna, false);

/** Igual que `politicaPorAlcance`, cuando la columna admite nulo: las filas sin registro se ven siempre. */
export const politicaPorAlcanceOpcional = (alcance: AlcanceDeRegistros, columna: string) =>
  politicaSobreColumna(alcance, columna, true);

/**
 * Políticas de la tabla de accesos: `aislamiento_por_empresa` y las de escritura, que solo
 * dejan asignar, cambiar o quitar registros que el usuario ve (los que consulta la tabla
 * protegida con su propia RLS) o todos si tiene alcance total.
 *
 * **Regla que no se puede romper:** una tabla de accesos nunca lleva una política de `select`
 * con subconsulta; PostgreSQL detectaría recursión infinita (accesos → registro → accesos).
 */
export const politicasDeTablaDeAccesos = (alcance: AlcanceDeRegistros) => {
  validar(alcance);
  const condicion = sql.raw(
    `${alcanceTotalDelRecurso(alcance.recurso)}
    or ${alcance.columna} in (select r.id from ${alcance.tablaDelRegistro} r)`,
  );
  const base = { as: 'restrictive', to: rolAplicacion } as const;
  return [
    politicaPorEmpresa(),
    pgPolicy('asignar_con_alcance', { ...base, for: 'insert', withCheck: condicion }),
    pgPolicy('cambiar_con_alcance', { ...base, for: 'update', using: condicion, withCheck: condicion }),
    pgPolicy('quitar_con_alcance', { ...base, for: 'delete', using: condicion }),
  ];
};
