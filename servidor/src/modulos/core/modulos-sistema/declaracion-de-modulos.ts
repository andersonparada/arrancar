import type { DefinicionModulo } from './definicion-modulo.js';

/**
 * Revisiones de lo que declara un módulo. Un fallo es un error de programación:
 * se detecta al arrancar el servidor, antes de atender ninguna petición.
 */

/** Cada variable empieza con la clave de su módulo y su valor predeterminado cumple su esquema. */
function verificarConfiguracion(modulo: DefinicionModulo): void {
  for (const variable of modulo.configuracion ?? []) {
    if (!variable.clave.startsWith(`${modulo.clave}.`)) {
      throw new Error(`La configuración "${variable.clave}" debe empezar con "${modulo.clave}.".`);
    }
    if (!variable.esquema.safeParse(variable.predeterminado).success) {
      throw new Error(`El valor predeterminado de "${variable.clave}" no cumple su esquema.`);
    }
  }
}

/** El permiso "ver todos" de cada recurso con alcance lo declara el mismo módulo. */
function verificarRecursosConAlcance(modulo: DefinicionModulo): void {
  const declarados = new Set(modulo.permisos.map((permiso) => permiso.clave));
  const sinPermiso = (modulo.recursosConAlcance ?? []).find((recurso) => !declarados.has(recurso.permisoVerTodos));
  if (sinPermiso) {
    throw new Error(
      `El recurso "${sinPermiso.clave}" usa el permiso "${sinPermiso.permisoVerTodos}", que su módulo no declara.`,
    );
  }
  const incoherente = (modulo.recursosConAlcance ?? []).find((recurso) => recurso.alcance.recurso !== recurso.clave);
  if (incoherente) {
    throw new Error(
      `El alcance del recurso "${incoherente.clave}" declara otra clave: "${incoherente.alcance.recurso}".`,
    );
  }
}

/** Los módulos de los que depende están instalados. */
function verificarDependencias(modulo: DefinicionModulo, instalados: ReadonlySet<string>): void {
  const faltante = (modulo.dependeDe ?? []).find((dependencia) => !instalados.has(dependencia));
  if (faltante) throw new Error(`El módulo "${modulo.clave}" depende de "${faltante}", que no está registrado.`);
}

/** @throws Error con el primer problema que encuentre en la declaración del módulo. */
export function verificarDeclaracion(modulo: DefinicionModulo, instalados: ReadonlySet<string>): void {
  verificarConfiguracion(modulo);
  verificarRecursosConAlcance(modulo);
  verificarDependencias(modulo, instalados);
}
