import type { DefinicionModuloCliente, DondeSeAporta, SeccionAportada } from '../tipos';

/** Una sección con el módulo que la aporta; la clave del módulo es también la clave en `secciones` del cuerpo. */
export interface SeccionDelModulo {
  modulo: string;
  seccion: SeccionAportada;
}

/** Las secciones de los módulos activos para ese formulario, en su orden (y con el del índice si empatan). */
export function seccionesDe(
  modulos: readonly DefinicionModuloCliente[],
  en: DondeSeAporta,
  moduloActivo: (clave: string) => boolean,
): SeccionDelModulo[] {
  return modulos
    .filter((modulo) => moduloActivo(modulo.clave))
    .flatMap((modulo) => (modulo.secciones ?? []).map((seccion) => ({ modulo: modulo.clave, seccion })))
    .filter(({ seccion }) => seccion.en === en)
    .sort((a, b) => a.seccion.orden - b.seccion.orden);
}

/**
 * Los errores de una sección, sin el prefijo con que los devuelve el servidor
 * (`secciones.libro-de-compras.regimenIsr` → `regimenIsr`).
 */
export function erroresDeLaSeccion(errores: Record<string, string>, modulo: string): Record<string, string> {
  const prefijo = `secciones.${modulo}.`;
  return Object.fromEntries(
    Object.entries(errores)
      .filter(([campo]) => campo.startsWith(prefijo))
      .map(([campo, mensaje]) => [campo.slice(prefijo.length), mensaje]),
  );
}

/** Lo que se envía en `secciones`: solo las secciones que ya tienen valor (una que no terminó de cargar no se envía). */
export function seccionesParaEnviar(valores: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== undefined));
}
