import type { RegistroModulos } from './registro-modulos.js';

let registro: RegistroModulos | null = null;

/** Fija la instancia única del registro. Lo llama la composición de la aplicación al arrancar. */
export function establecerRegistroModulos(instancia: RegistroModulos): void {
  registro = instancia;
}

/** Devuelve el registro de módulos; falla si la aplicación todavía no lo configuró. */
export function obtenerRegistroModulos(): RegistroModulos {
  if (!registro) throw new Error('El registro de módulos no se ha inicializado.');
  return registro;
}
