import { z } from 'zod';
import { interpretarSeccion } from '../../core/compartido/http/secciones-aportadas.js';
import {
  AGENTES_DE_RETENCION_DE_IVA,
  problemasFiscalesDeEmpresa,
  REGIMENES_DE_ISR_DE_EMPRESA,
  REGIMENES_DE_IVA,
  type PropiedadesFiscalesDeEmpresa,
} from '../dominio/datos-fiscales-de-empresa.js';
import {
  problemasFiscalesDeProveedor,
  retencionesPropuestas,
  REGIMENES_DE_ISR_DE_PROVEEDOR,
  type PropiedadesFiscalesDeProveedor,
} from '../dominio/datos-fiscales-de-proveedor.js';
import type { ProblemaDeDatosFiscales } from '../dominio/errores.js';

/** Clave con la que este módulo viaja en `secciones` del formulario de Empresas y del de Proveedores. */
export const CLAVE_DE_LA_SECCION_FISCAL = 'libro-de-compras';

function señalar(ctx: z.RefinementCtx, problemas: readonly ProblemaDeDatosFiscales[]): void {
  for (const { campo, mensaje } of problemas) ctx.addIssue({ code: 'custom', path: [campo], message: mensaje });
}

/** La sección fiscal del formulario de Empresas; lo que falte toma el valor por omisión. */
export const esquemaSeccionFiscalDeEmpresa = z
  .object({
    regimenIva: z.enum(REGIMENES_DE_IVA).default('general'),
    regimenIsr: z.enum(REGIMENES_DE_ISR_DE_EMPRESA).default('utilidades'),
    agenteDeRetencionIva: z.enum(AGENTES_DE_RETENCION_DE_IVA).default('ninguno'),
    esAgenteDeRetencionIsr: z.boolean().default(false),
  })
  .superRefine((datos, ctx) => señalar(ctx, problemasFiscalesDeEmpresa(datos)));

const entradaDeProveedor = z.object({
  esPequenoContribuyente: z.boolean().default(false),
  regimenIsr: z.enum(REGIMENES_DE_ISR_DE_PROVEEDOR).nullish(),
  esAgenteDeRetencionIva: z.boolean().default(false),
  seLeRetieneIva: z.boolean().optional(),
  seLeRetieneIsr: z.boolean().optional(),
  seLeRetieneIvaPequenoContribuyente: z.boolean().optional(),
});

/** Completa con lo que propone el régimen lo que el usuario no dijo. */
function conLoQueProponeElRegimen(entrada: z.infer<typeof entradaDeProveedor>): PropiedadesFiscalesDeProveedor {
  const { esPequenoContribuyente, esAgenteDeRetencionIva } = entrada;
  const regimenIsr =
    entrada.regimenIsr === undefined ? (esPequenoContribuyente ? null : 'utilidades') : entrada.regimenIsr;
  const propuestas = retencionesPropuestas({ esPequenoContribuyente, esAgenteDeRetencionIva, regimenIsr });
  return {
    esPequenoContribuyente,
    esAgenteDeRetencionIva,
    regimenIsr,
    seLeRetieneIva: entrada.seLeRetieneIva ?? propuestas.seLeRetieneIva,
    seLeRetieneIsr: entrada.seLeRetieneIsr ?? propuestas.seLeRetieneIsr,
    seLeRetieneIvaPequenoContribuyente:
      entrada.seLeRetieneIvaPequenoContribuyente ?? propuestas.seLeRetieneIvaPequenoContribuyente,
  };
}

/**
 * La sección fiscal del formulario de Proveedores. Lo que falte se propone según el régimen; lo que el usuario
 * diga manda, dentro de las reglas del dominio.
 */
export const esquemaSeccionFiscalDeProveedor = entradaDeProveedor
  .transform(conLoQueProponeElRegimen)
  .superRefine((datos, ctx) => señalar(ctx, problemasFiscalesDeProveedor(datos)));

export const esquemaParamsDeEmpresa = z.object({ empresaId: z.uuid() });
export const esquemaParamsDeProveedor = z.object({ proveedorId: z.uuid() });

export type ParamsDeEmpresa = z.infer<typeof esquemaParamsDeEmpresa>;
export type ParamsDeProveedor = z.infer<typeof esquemaParamsDeProveedor>;

/**
 * La sección fiscal de empresa de un formulario, validada, o `null` si el formulario no la trae.
 * @throws SeccionInvalida con los errores por campo (`secciones.libro-de-compras.<campo>`).
 */
export function seccionFiscalDeEmpresa(
  secciones: Readonly<Record<string, unknown>>,
): PropiedadesFiscalesDeEmpresa | null {
  const seccion = secciones[CLAVE_DE_LA_SECCION_FISCAL];
  if (seccion === undefined) return null;
  return interpretarSeccion(CLAVE_DE_LA_SECCION_FISCAL, esquemaSeccionFiscalDeEmpresa, seccion);
}

/**
 * La sección fiscal de proveedor de un formulario, validada, o `null` si el formulario no la trae.
 * @throws SeccionInvalida con los errores por campo (`secciones.libro-de-compras.<campo>`).
 */
export function seccionFiscalDeProveedor(
  secciones: Readonly<Record<string, unknown>>,
): PropiedadesFiscalesDeProveedor | null {
  const seccion = secciones[CLAVE_DE_LA_SECCION_FISCAL];
  if (seccion === undefined) return null;
  return interpretarSeccion(CLAVE_DE_LA_SECCION_FISCAL, esquemaSeccionFiscalDeProveedor, seccion);
}
