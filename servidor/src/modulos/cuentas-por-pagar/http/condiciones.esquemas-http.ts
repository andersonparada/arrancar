import { z } from 'zod';
import { interpretarSeccion } from '../../core/compartido/http/secciones-aportadas.js';
import { DIAS_MAXIMOS_DE_CREDITO, type CambioDeCondiciones } from '../dominio/condiciones-de-proveedor.js';

/** Clave con la que este módulo viaja en `secciones` del formulario de Proveedores. */
export const CLAVE_DE_LA_SECCION_DE_CONDICIONES = 'cuentas-por-pagar';

const MENSAJE_DE_DIAS = `Los días de crédito son un número entero de 0 a ${DIAS_MAXIMOS_DE_CREDITO}, o vacío para el plazo por omisión.`;

/**
 * La sección «Cuentas por pagar» del formulario de Proveedores. Un campo ausente se queda como estaba; `diasDeCredito`
 * en `null` vuelve al plazo por omisión (un mes) y `0` es contado.
 */
export const esquemaSeccionDeCondiciones = z.object({
  diasDeCredito: z
    .number({ error: MENSAJE_DE_DIAS })
    .int({ error: MENSAJE_DE_DIAS })
    .min(0, { error: MENSAJE_DE_DIAS })
    .max(DIAS_MAXIMOS_DE_CREDITO, { error: MENSAJE_DE_DIAS })
    .nullable()
    .optional(),
  contarDesdeLaRecepcion: z.boolean({ error: 'Indique si el plazo corre desde la recepción.' }).optional(),
});

/**
 * La sección de condiciones de un formulario, validada, o `null` si el formulario no la trae.
 * @throws SeccionInvalida con los errores por campo (`secciones.cuentas-por-pagar.<campo>`).
 */
export function seccionDeCondiciones(secciones: Readonly<Record<string, unknown>>): CambioDeCondiciones | null {
  const seccion = secciones[CLAVE_DE_LA_SECCION_DE_CONDICIONES];
  if (seccion === undefined) return null;
  const { diasDeCredito, contarDesdeLaRecepcion } = interpretarSeccion(
    CLAVE_DE_LA_SECCION_DE_CONDICIONES,
    esquemaSeccionDeCondiciones,
    seccion,
  );
  return {
    ...(diasDeCredito !== undefined && { diasDeCredito }),
    ...(contarDesdeLaRecepcion !== undefined && { contarDesdeLaRecepcion }),
  };
}
