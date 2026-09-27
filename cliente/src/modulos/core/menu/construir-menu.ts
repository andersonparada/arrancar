import type { Component } from 'vue';
import { SECCIONES_DEL_MENU } from '../textos';
import type { DefinicionModuloCliente, EntradaMenu, GrupoMenu, SeccionMenu } from '../tipos';

export interface FiltroMenu {
  moduloActivo: (clave: string) => boolean;
  puede: (permiso: string) => boolean;
  esSuperacceso: boolean;
}

export interface SeccionVisible {
  seccion: SeccionMenu;
  titulo: string;
  entradas: EntradaMenu[];
}

export interface GrupoVisible {
  clave: string;
  titulo: string;
  icono: Component;
  secciones: SeccionVisible[];
}

const ORDEN_DE_SECCIONES = Object.keys(SECCIONES_DEL_MENU) as SeccionMenu[];

function grupoPermitido(grupo: GrupoMenu, modulo: string, filtro: FiltroMenu): boolean {
  return grupo.soloSuperacceso ? filtro.esSuperacceso : filtro.moduloActivo(modulo);
}

function seccionesVisibles(entradas: EntradaMenu[], filtro: FiltroMenu): SeccionVisible[] {
  const permitidas = entradas.filter((entrada) => !entrada.permiso || filtro.puede(entrada.permiso));
  return ORDEN_DE_SECCIONES.map((seccion) => ({
    seccion,
    titulo: SECCIONES_DEL_MENU[seccion],
    entradas: permitidas.filter((entrada) => entrada.seccion === seccion),
  })).filter((seccion) => seccion.entradas.length > 0);
}

/**
 * El menú que ve el usuario: un grupo por módulo activo (o de soporte) con sus
 * secciones en orden. Los grupos y las secciones vacías no se muestran.
 */
export function construirMenu(modulos: readonly DefinicionModuloCliente[], filtro: FiltroMenu): GrupoVisible[] {
  return modulos
    .flatMap((modulo) => modulo.menu.filter((grupo) => grupoPermitido(grupo, modulo.clave, filtro)))
    .map(({ clave, titulo, icono, entradas }) => ({
      clave,
      titulo,
      icono,
      secciones: seccionesVisibles(entradas, filtro),
    }))
    .filter((grupo) => grupo.secciones.length > 0);
}

/** El grupo al que pertenece una ruta, para abrirlo al entrar. */
export function grupoDeLaRuta(grupos: GrupoVisible[], ruta: string): string | null {
  const contiene = (entrada: EntradaMenu) => ruta === entrada.ruta || ruta.startsWith(`${entrada.ruta}/`);
  const grupo = grupos.find((g) => g.secciones.some((s) => s.entradas.some(contiene)));
  return grupo?.clave ?? null;
}
