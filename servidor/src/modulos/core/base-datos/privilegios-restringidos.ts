import pg from 'pg';

/** Lo que `arrancar_app` nunca debe hacer en una tabla, aunque las variables de la transacción estén bien puestas. */
export interface RestriccionDePrivilegios {
  /** Privilegios que se le quitan a la tabla completa. */
  readonly sin: readonly ('insert' | 'update' | 'delete')[];
  /** Si se indica, `update` solo se permite sobre estas columnas (nombres en la base de datos). */
  readonly actualizarSolo?: readonly string[];
}

/**
 * Restricciones de privilegios de las tablas de `core`, por `<esquema>.<tabla>`. El migrador las aplica después del
 * `grant` general (que de otro modo las desharía) en cada corrida. `null` es una tabla sin restricción.
 * Una prueba revisa que toda tabla de `core` esté clasificada aquí.
 *
 * `insert` nunca se limita por columna: Drizzle nombra todas las columnas al insertar y PostgreSQL exigiría el
 * privilegio sobre cada una; lo del `insert` lo cuidan la RLS y los disparadores.
 */
export const RESTRICCIONES_DE_PRIVILEGIOS: Readonly<Record<string, RestriccionDePrivilegios | null>> = {
  'core.empresas': {
    sin: ['delete'],
    actualizarSolo: [
      'nombre',
      'nit',
      'direccion',
      'telefono',
      'correo',
      'moneda_base',
      'activa',
      'actualizado_en',
      'actualizado_por',
    ],
  },
  'core.cuentas': { sin: ['delete'], actualizarSolo: ['nombre', 'activa', 'actualizado_en'] },
  'core.cuenta_modulos': { sin: ['update'] },
  'core.empresa_usuarios': { sin: ['update'] },
  'core.usuarios': {
    sin: ['delete'],
    actualizarSolo: [
      'correo',
      'nombres',
      'apellidos',
      'hash_contrasena',
      'activo',
      'ultimo_acceso_en',
      'actualizado_en',
    ],
  },
  'core.sesiones': { sin: [], actualizarSolo: ['empresa_activa_id', 'expira_en'] },
  'core.roles': { sin: [], actualizarSolo: ['nombre', 'descripcion', 'acceso_total', 'actualizado_en'] },
  'core.rol_permisos': { sin: ['update'] },
  'core.usuario_roles': { sin: ['update'] },
  'core.usuario_permisos': { sin: ['update'] },
  'core.configuraciones': { sin: [], actualizarSolo: ['valor', 'actualizado_por', 'actualizado_en'] },
  'core.bitacora_superacceso': { sin: ['update', 'delete'] },
  'core.auditoria': { sin: ['update', 'delete'] },
  'core.recursos_de_auditoria_permanente': { sin: ['insert', 'update', 'delete'] },
  'core.feriados': { sin: ['update'] },
  'core.departamentos': { sin: ['insert', 'update', 'delete'] },
  'core.municipios': { sin: ['insert', 'update', 'delete'] },
  'core.monedas': { sin: ['delete'] },
  'core.monedas_del_banguat': { sin: ['delete'] },
  'core.tipos_de_cambio': { sin: ['update', 'delete'] },
  'core.consultas_al_banguat': { sin: ['update', 'delete'] },
  'core.archivos': null,
  'core.correlativos': null,
  'core.servidor_de_correo': null,
  'core.correos_salientes': null,
  'core.destinatarios_de_correos': null,
  'core.intentos_de_correos': null,
};

function tablaCitada(tabla: string): string {
  return tabla.split('.').map(pg.escapeIdentifier).join('.');
}

function sentenciasDe(tabla: string, restriccion: RestriccionDePrivilegios, rol: string): string[] {
  const nombre = tablaCitada(tabla);
  const sentencias = restriccion.sin.map((privilegio) => `revoke ${privilegio} on ${nombre} from ${rol}`);
  if (!restriccion.actualizarSolo) return sentencias;
  const columnas = restriccion.actualizarSolo.map((columna) => pg.escapeIdentifier(columna)).join(', ');
  // Quitar `update` de la tabla quita también los de columna, así que el orden hace idempotente la aplicación.
  return [...sentencias, `revoke update on ${nombre} from ${rol}`, `grant update (${columnas}) on ${nombre} to ${rol}`];
}

/**
 * Sentencias SQL que dejan a `rol` con los privilegios restringidos de las tablas del esquema, para ejecutarlas justo
 * después del `grant` general. Sin restricciones para ese esquema devuelve una lista vacía.
 */
export function sentenciasDeRestriccion(esquema: string, rol: string): string[] {
  return Object.entries(RESTRICCIONES_DE_PRIVILEGIOS)
    .filter(([tabla]) => tabla.startsWith(`${esquema}.`))
    .flatMap(([tabla, restriccion]) => (restriccion ? sentenciasDe(tabla, restriccion, rol) : []))
    .map((sentencia) => `${sentencia};`);
}
