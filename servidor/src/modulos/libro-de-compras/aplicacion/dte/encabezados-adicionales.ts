import { z } from 'zod';
import type { EncabezadosAdicionales } from './mapa-de-encabezados-sat.js';

const esquema = z.record(z.string(), z.array(z.string().min(1).max(200)).max(50));

/**
 * Lee la variable `libro-de-compras.dte.encabezados_adicionales` (un JSON `{ "<campo o impuesto>": ["<título>", …] }`).
 * Un JSON inválido no tumba la importación: se ignora y se avisa por `avisar` (el registro del servidor).
 */
export function interpretarEncabezadosAdicionales(
  texto: string,
  avisar: (mensaje: string) => void,
): EncabezadosAdicionales {
  if (texto.trim() === '') return {};
  try {
    return esquema.parse(JSON.parse(texto));
  } catch {
    avisar('La variable libro-de-compras.dte.encabezados_adicionales no es un JSON válido: se ignora.');
    return {};
  }
}
