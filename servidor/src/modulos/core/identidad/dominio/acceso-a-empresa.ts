import { EmpresaRepetida } from './errores.js';

/** En qué empresa trabaja un usuario y con qué rol. */
export interface AccesoAEmpresa {
  empresaId: string;
  rolId: string;
}

/** @throws EmpresaRepetida si una empresa aparece más de una vez: solo se tiene un rol por empresa. */
export function exigirEmpresasSinRepetir(accesos: readonly AccesoAEmpresa[]): void {
  const empresas = new Set(accesos.map((acceso) => acceso.empresaId));
  if (empresas.size !== accesos.length) throw new EmpresaRepetida();
}
