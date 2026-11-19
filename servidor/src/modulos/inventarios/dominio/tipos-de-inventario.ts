/**
 * Los tipos de inventario del reporte semestral de la SAT (`docs/modulos/diseno-inventarios.md` §5.3 y V-4: la
 * correspondencia con la clase de la SAT es fija y se arma con el reporte, INV-13).
 */
export const TIPOS_DE_INVENTARIO = [
  'mercaderia',
  'materia_prima',
  'suministros',
  'producto_en_proceso',
  'producto_terminado',
  'repuestos',
  'empaques',
] as const;

export type TipoDeInventario = (typeof TIPOS_DE_INVENTARIO)[number];
