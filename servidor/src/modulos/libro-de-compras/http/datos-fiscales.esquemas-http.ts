import { z } from 'zod';
import { interpretarSeccion } from '../../core/compartido/http/secciones-aportadas.js';
import {
  AGENTES_DE_RETENCION_DE_IVA,
  problemasFiscalesDeEmpresa,
  REGIMENES_DE_ISR_DE_EMPRESA,
  REGIMENES_DE_IVA,
  TIPOS_DE_PERSONA,
  type PropiedadesFiscalesDeEmpresa,
} from '../dominio/datos-fiscales-de-empresa.js';
import { datosPropuestos } from '../dominio/datos-propuestos-de-empresa.js';
import {
  problemasFiscalesDeProveedor,
  regimenIsrPropuesto,
  retencionesPropuestas,
  REGIMENES_DE_ISR_DE_PROVEEDOR,
  REGIMENES_DE_IVA_DE_PROVEEDOR,
  type PropiedadesFiscalesDeProveedor,
} from '../dominio/datos-fiscales-de-proveedor.js';
import type { ProblemaDeDatosFiscales } from '../dominio/errores.js';

/** Clave con la que este módulo viaja en `secciones` del formulario de Empresas y del de Proveedores. */
export const CLAVE_DE_LA_SECCION_FISCAL = 'libro-de-compras';

function señalar(ctx: z.RefinementCtx, problemas: readonly ProblemaDeDatosFiscales[]): void {
  for (const { campo, mensaje } of problemas) ctx.addIssue({ code: 'custom', path: [campo], message: mensaje });
}

const FECHA_DE_VIGENCIA = /^\d{4}-(0[1-9]|1[0-2])-01$/;

const entradaDeEmpresa = z.object({
  tipoDePersona: z.enum(TIPOS_DE_PERSONA, { error: 'Escoja si es persona individual o jurídica.' }),
  regimenIva: z.enum(REGIMENES_DE_IVA).default('general'),
  regimenIsr: z.enum(REGIMENES_DE_ISR_DE_EMPRESA).nullish(),
  agenteDeRetencionIva: z.enum(AGENTES_DE_RETENCION_DE_IVA).default('ninguno'),
  esAgenteDeRetencionIsr: z.boolean().optional(),
  /** `aaaa-mm-01`, o `null` para «desde el inicio»; si no llega, rigen desde la vigencia de hoy. */
  vigenteDesde: z.string().regex(FECHA_DE_VIGENCIA, 'Escoja el primer día de un mes.').nullish(),
});

/** Lo que la sección de Empresas manda: los datos de una vigencia y desde cuándo rigen. */
export interface SeccionFiscalDeEmpresa {
  datos: PropiedadesFiscalesDeEmpresa;
  vigenteDesde: string | null | undefined;
}

/**
 * Completa con lo que propone el régimen y el tipo de persona lo que el usuario no dijo. Si algo no tiene
 * propuesta (por ejemplo, si lleva contabilidad completa), el usuario debe contestarlo.
 */
function conLoQueProponeElRegimenDeEmpresa(
  entrada: z.infer<typeof entradaDeEmpresa>,
  ctx: z.RefinementCtx,
): SeccionFiscalDeEmpresa {
  const { tipoDePersona, regimenIva, agenteDeRetencionIva } = entrada;
  const propuestos = datosPropuestos(regimenIva, tipoDePersona, entrada.regimenIsr ?? null);
  const regimenIsr = entrada.regimenIsr === undefined ? propuestos.regimenIsr : entrada.regimenIsr;
  const esAgente = entrada.esAgenteDeRetencionIsr ?? propuestos.esAgenteDeRetencionIsr;
  if (esAgente === undefined) {
    señalar(ctx, [{ campo: 'esAgenteDeRetencionIsr', mensaje: 'Diga si la empresa lleva contabilidad completa.' }]);
  }
  const datos = {
    tipoDePersona,
    regimenIva,
    regimenIsr: regimenIsr ?? null,
    agenteDeRetencionIva,
    esAgenteDeRetencionIsr: esAgente ?? true,
  };
  return { datos, vigenteDesde: entrada.vigenteDesde };
}

/**
 * La sección fiscal del formulario de Empresas. El tipo de persona es obligatorio (no se supone); lo demás se
 * propone según el régimen y la persona (`datosPropuestos`), y lo que el usuario diga manda dentro de las reglas.
 */
export const esquemaSeccionFiscalDeEmpresa = entradaDeEmpresa
  .transform(conLoQueProponeElRegimenDeEmpresa)
  .superRefine((seccion, ctx) => señalar(ctx, problemasFiscalesDeEmpresa(seccion.datos)));

const entradaDeProveedor = z.object({
  regimenIva: z.enum(REGIMENES_DE_IVA_DE_PROVEEDOR).default('general'),
  regimenIsr: z.enum(REGIMENES_DE_ISR_DE_PROVEEDOR).nullish(),
  esAgenteDeRetencionIva: z.boolean().default(false),
  seLeRetieneIva: z.boolean().optional(),
  seLeRetieneIsr: z.boolean().optional(),
  seLeRetieneIvaPequenoContribuyente: z.boolean().optional(),
});

/** Completa con lo que propone el régimen lo que el usuario no dijo. */
function conLoQueProponeElRegimen(entrada: z.infer<typeof entradaDeProveedor>): PropiedadesFiscalesDeProveedor {
  const { regimenIva, esAgenteDeRetencionIva } = entrada;
  const regimenIsr = entrada.regimenIsr === undefined ? regimenIsrPropuesto(regimenIva) : entrada.regimenIsr;
  const propuestas = retencionesPropuestas({ regimenIva, esAgenteDeRetencionIva, regimenIsr });
  return {
    regimenIva,
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
export const esquemaParamsDeVigencia = z.object({ empresaId: z.uuid(), vigenciaId: z.uuid() });
export const esquemaParamsDeProveedor = z.object({ proveedorId: z.uuid() });

export type ParamsDeEmpresa = z.infer<typeof esquemaParamsDeEmpresa>;
export type ParamsDeVigencia = z.infer<typeof esquemaParamsDeVigencia>;
export type ParamsDeProveedor = z.infer<typeof esquemaParamsDeProveedor>;

/**
 * La sección fiscal de empresa de un formulario, validada, o `null` si el formulario no la trae.
 * @throws SeccionInvalida con los errores por campo (`secciones.libro-de-compras.<campo>`).
 */
export function seccionFiscalDeEmpresa(secciones: Readonly<Record<string, unknown>>): SeccionFiscalDeEmpresa | null {
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
