import { z } from 'zod';
import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import { esquemaSeccionDeCondiciones } from './condiciones.esquemas-http.js';

/** Las columnas del Excel «Plazos de proveedores»: a quién se refiere cada fila y sus condiciones de pago. */
export const columnasDePlazos = (): Columna[] => [
  { clave: 'nit', titulo: 'NIT', requerido: false, tipo: 'texto' },
  { clave: 'proveedorNombre', titulo: 'Proveedor', requerido: false, tipo: 'texto' },
  { clave: 'diasDeCredito', titulo: 'Días de crédito', requerido: false, tipo: 'entero' },
  { clave: 'contarDesdeLaRecepcion', titulo: 'Contar desde la recepción', requerido: false, tipo: 'siNo' },
];

const MENSAJE_DE_IDENTIDAD = 'Escriba el NIT del proveedor o, si no tiene NIT, su nombre.';

const tieneIdentidad = ({ nit, proveedorNombre }: { nit?: string | null; proveedorNombre?: string | null }) =>
  Boolean(nit?.trim() || proveedorNombre?.trim());

/**
 * Una fila del Excel: la sección de condiciones del formulario de Proveedores (los mismos límites de días) más la
 * identidad del proveedor. Los días vacíos vuelven al plazo por omisión.
 */
export const esquemaDePlazoEnExcel = esquemaSeccionDeCondiciones
  .extend({ nit: z.string().nullish(), proveedorNombre: z.string().nullish() })
  .refine(tieneIdentidad, { path: ['nit'], error: MENSAJE_DE_IDENTIDAD });

export type PlazoEnExcel = z.output<typeof esquemaDePlazoEnExcel>;

/** Los textos de la hoja de instrucciones. */
export const NOTAS_DE_PLAZOS = [
  'Este Excel solo cambia el plazo de proveedores que ya existen: no crea proveedores nuevos.',
  'Identifique al proveedor por su NIT. Si no tiene NIT, deje el NIT vacío y escriba su nombre exacto, tal como está en Proveedores; si dos proveedores se llaman igual, la fila se rechaza.',
  'Días de crédito: de 0 a 365; 0 es de contado. Vacío vuelve al plazo por omisión de la empresa.',
  'Contar desde la recepción: Sí si el plazo corre desde que se recibe el documento; vacío es No (corre desde la emisión).',
  'Cambiar el plazo no cambia el vencimiento de los documentos ya recibidos.',
  'Cada proveedor puede aparecer una sola vez en el archivo. El plazo es de la cuenta: vale para todas sus empresas.',
];
