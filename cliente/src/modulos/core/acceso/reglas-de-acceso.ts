import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

/** Lo que las reglas necesitan saber de la sesión. */
export interface SesionParaAcceso {
  autenticado: boolean;
  esSuperacceso: boolean;
  empresa: unknown;
  puede(permiso: string): boolean;
}

type Destino = Pick<RouteLocationNormalized, 'meta' | 'name' | 'fullPath'>;

/** Devuelve a dónde desviar, `true` para entrar ya, o nada para que decida la siguiente regla. */
type Regla = (destino: Destino, sesion: SesionParaAcceso) => RouteLocationRaw | true | undefined;

const paginaPublica: Regla = ({ meta, name }, sesion) => {
  if (!meta.publica) return undefined;
  return sesion.autenticado && name === 'iniciar-sesion' ? { name: 'inicio' } : true;
};

const exigeSesion: Regla = ({ fullPath }, sesion) =>
  sesion.autenticado ? undefined : { name: 'iniciar-sesion', query: { volver: fullPath } };

const exigeSuperacceso: Regla = ({ meta }, sesion) =>
  meta.soloSuperacceso && !sesion.esSuperacceso ? { name: 'sin-permiso' } : undefined;

const exigeEmpresa: Regla = ({ meta }, sesion) =>
  (meta.requiereEmpresa ?? true) && !sesion.empresa ? { name: 'elegir-empresa' } : undefined;

const exigePermiso: Regla = ({ meta }, sesion) =>
  meta.permiso && !sesion.puede(meta.permiso) ? { name: 'sin-permiso' } : undefined;

/** En este orden: la primera regla que decide gana. */
const REGLAS: Regla[] = [paginaPublica, exigeSesion, exigeSuperacceso, exigeEmpresa, exigePermiso];

/**
 * Decide a dónde ir antes de entrar a una ruta: inicio de sesión, elegir
 * empresa o "sin permiso". Es solo navegación; la API valida lo mismo.
 */
export function resolverAcceso(destino: Destino, sesion: SesionParaAcceso): RouteLocationRaw | true {
  for (const regla of REGLAS) {
    const decision = regla(destino, sesion);
    if (decision !== undefined) return decision;
  }
  return true;
}
