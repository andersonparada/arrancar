import { z } from 'zod';
import { interpretarSeccion } from '../../core/compartido/http/secciones-aportadas.js';
import {
  AGENTES_DE_RETENCION_DE_IVA_DE_CLIENTE,
  problemasFiscalesDeCliente,
  type PropiedadesFiscalesDeCliente,
} from '../dominio/datos-fiscales-de-cliente.js';

/** Clave con la que este módulo viaja en `secciones` del formulario de Clientes. */
export const CLAVE_DE_LA_SECCION_DE_VENTAS = 'libro-de-ventas';

/**
 * La sección «Datos fiscales (ventas)» del formulario de Clientes. Lo que no llega vale lo de omisión (no retiene
 * nada); lo que llega manda, dentro de las reglas del dominio.
 */
export const esquemaSeccionFiscalDeCliente = z
  .object({
    agenteDeRetencionIva: z.enum(AGENTES_DE_RETENCION_DE_IVA_DE_CLIENTE).default('ninguno'),
    exportaProductosAgropecuarios: z.boolean().default(false),
    retieneIsr: z.boolean().default(false),
    retieneIvaAPequenoContribuyente: z.boolean().default(false),
  })
  .superRefine((datos, ctx) => {
    for (const { campo, mensaje } of problemasFiscalesDeCliente(datos)) {
      ctx.addIssue({ code: 'custom', path: [campo], message: mensaje });
    }
  });

export const esquemaParamsDeCliente = z.object({ clienteId: z.uuid() });

export type ParamsDeCliente = z.infer<typeof esquemaParamsDeCliente>;

/**
 * La sección de datos fiscales de un formulario de Clientes, validada, o `null` si el formulario no la trae.
 * @throws SeccionInvalida con los errores por campo (`secciones.libro-de-ventas.<campo>`).
 */
export function seccionFiscalDeCliente(
  secciones: Readonly<Record<string, unknown>>,
): PropiedadesFiscalesDeCliente | null {
  const seccion = secciones[CLAVE_DE_LA_SECCION_DE_VENTAS];
  if (seccion === undefined) return null;
  return interpretarSeccion(CLAVE_DE_LA_SECCION_DE_VENTAS, esquemaSeccionFiscalDeCliente, seccion);
}
