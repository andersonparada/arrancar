/**
 * Secciones que otros módulos aportan al formulario de Empresas o de Proveedores: el cuerpo del
 * formulario trae `secciones: { '<clave-del-modulo>': { ... } }` y cada módulo activo valida y
 * guarda la suya cuando llega el aviso (ver `empresas.contratos.ts` y `terceros.contratos.ts`).
 */
export type SeccionesAportadas = Readonly<Record<string, unknown>>;
