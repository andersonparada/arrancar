import { EmpresaRepetida } from './errores.js';

/** @throws EmpresaRepetida si una empresa aparece más de una vez. */
export function exigirEmpresasSinRepetir(empresaIds: readonly string[]): void {
  if (new Set(empresaIds).size !== empresaIds.length) throw new EmpresaRepetida();
}
