import type { OpcionBuscable } from './busqueda-de-opciones';

/** Lo mínimo de una empresa que el selector necesita. */
export interface EmpresaParaElegir {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
}

const porNombre = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' });

/**
 * Las opciones del selector de empresa, ordenadas por nombre. Solo se agrupan por cuenta
 * cuando el usuario entra a empresas de más de una (el superacceso), para no repetir
 * el mismo título en todas.
 */
export function opcionesDeEmpresa(empresas: EmpresaParaElegir[]): OpcionBuscable<string>[] {
  const agrupar = new Set(empresas.map((empresa) => empresa.cuentaId)).size > 1;
  return [...empresas]
    .sort((a, b) => porNombre(a.cuentaNombre, b.cuentaNombre) || porNombre(a.nombre, b.nombre))
    .map((empresa) => ({
      valor: empresa.id,
      texto: empresa.nombre,
      ...(agrupar ? { grupo: empresa.cuentaNombre } : {}),
    }));
}
