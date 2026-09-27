import type { DefinicionModuloCliente, EntradaMenu } from './core/tipos';
import { moduloCore } from './core/modulo';
import { moduloEmpresas } from './empresas/modulo';
import { moduloTerceros } from './terceros/modulo';

/** Módulos del frontend. Para agregar uno nuevo basta con sumarlo a esta lista. */
export const modulosCliente: readonly DefinicionModuloCliente[] = [moduloCore, moduloEmpresas, moduloTerceros];

export interface FiltroMenu {
  moduloActivo: (clave: string) => boolean;
  puede: (permiso: string) => boolean;
  esSuperacceso: boolean;
}

/** Entradas del menú visibles para el usuario, agrupadas y en orden de registro. */
export function construirMenu(filtro: FiltroMenu): { grupo: string; entradas: EntradaMenu[] }[] {
  const grupos = new Map<string, EntradaMenu[]>();
  for (const modulo of modulosCliente) {
    for (const entrada of modulo.menu) {
      if (entrada.soloSuperacceso && !filtro.esSuperacceso) continue;
      if (!entrada.soloSuperacceso && !filtro.moduloActivo(modulo.clave)) continue;
      if (entrada.permiso && !filtro.puede(entrada.permiso)) continue;
      const grupo = entrada.grupo ?? 'General';
      grupos.set(grupo, [...(grupos.get(grupo) ?? []), entrada]);
    }
  }
  return [...grupos.entries()].map(([grupo, entradas]) => ({ grupo, entradas }));
}
