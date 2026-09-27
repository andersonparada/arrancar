import type { Component } from 'vue';
import { SECCIONES_DEL_MENU } from '../textos';
import type { DefinicionModuloCliente, EntradaMenu, GrupoMenu, SeccionMenu } from '../tipos';

export interface FiltroMenu {
  moduloActivo: (clave: string) => boolean;
  puede: (permiso: string) => boolean;
  esSuperacceso: boolean;
}

export interface SeccionVisible {
  /** Única en todo el menú (`clientes/administracion`), para recordar si está abierta. */
  clave: string;
  titulo: string;
  entradas: EntradaMenu[];
}

export interface GrupoVisible {
  clave: string;
  titulo: string;
  icono: Component;
  secciones: SeccionVisible[];
  /**
   * Con una sola sección el separador ("Administración") no aporta nada: sus
   * opciones van directo bajo el grupo.
   */
  conSecciones: boolean;
}

const ORDEN_DE_SECCIONES = Object.keys(SECCIONES_DEL_MENU) as SeccionMenu[];

function grupoPermitido(grupo: GrupoMenu, modulo: string, filtro: FiltroMenu): boolean {
  return grupo.soloSuperacceso ? filtro.esSuperacceso : filtro.moduloActivo(modulo);
}

function seccionesVisibles(grupo: GrupoMenu, filtro: FiltroMenu): SeccionVisible[] {
  const permitidas = grupo.entradas.filter((entrada) => !entrada.permiso || filtro.puede(entrada.permiso));
  return ORDEN_DE_SECCIONES.map((seccion) => ({
    clave: `${grupo.clave}/${seccion}`,
    titulo: SECCIONES_DEL_MENU[seccion],
    entradas: permitidas.filter((entrada) => entrada.seccion === seccion),
  })).filter((seccion) => seccion.entradas.length > 0);
}

function grupoVisible(grupo: GrupoMenu, filtro: FiltroMenu): GrupoVisible {
  const secciones = seccionesVisibles(grupo, filtro);
  const { clave, titulo, icono } = grupo;
  return { clave, titulo, icono, secciones, conSecciones: secciones.length > 1 };
}

/**
 * El menú que ve el usuario: un grupo por módulo activo (o de soporte) con sus
 * secciones en orden. Los grupos y las secciones vacías no se muestran.
 */
export function construirMenu(modulos: readonly DefinicionModuloCliente[], filtro: FiltroMenu): GrupoVisible[] {
  return modulos
    .flatMap((modulo) => modulo.menu.filter((grupo) => grupoPermitido(grupo, modulo.clave, filtro)))
    .map((grupo) => grupoVisible(grupo, filtro))
    .filter((grupo) => grupo.secciones.length > 0);
}

const contiene = (ruta: string) => (entrada: EntradaMenu) =>
  ruta === entrada.ruta || ruta.startsWith(`${entrada.ruta}/`);

/** El grupo y la sección de una ruta (y de sus subpáginas), para abrirlos al entrar. */
export function plegablesDeLaRuta(grupos: GrupoVisible[], ruta: string): string[] {
  for (const grupo of grupos) {
    const seccion = grupo.secciones.find((s) => s.entradas.some(contiene(ruta)));
    if (seccion) return [grupo.clave, seccion.clave];
  }
  return [];
}
