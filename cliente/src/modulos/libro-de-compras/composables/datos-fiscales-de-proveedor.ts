import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type {
  DatosFiscalesDeProveedor,
  RegimenDeIsrDeProveedor,
  RegimenDeIvaDeProveedor,
} from '../servicios/libro-de-compras.api';
import { REGIMENES_DE_ISR_DE_PROVEEDOR, REGIMENES_DE_IVA_DE_PROVEEDOR } from '../textos';

/** Lo que el formulario de Proveedores envía en `secciones['libro-de-compras']`. */
export type FiscalesDeProveedor = Omit<DatosFiscalesDeProveedor, 'proveedorId' | 'guardado'>;

/** Lo que el usuario decide; de aquí se proponen los tres «se le retiene». */
export type BaseFiscalDeProveedor = Pick<FiscalesDeProveedor, 'regimenIva' | 'regimenIsr' | 'esAgenteDeRetencionIva'>;

type Retenciones = Pick<
  FiscalesDeProveedor,
  'seLeRetieneIva' | 'seLeRetieneIsr' | 'seLeRetieneIvaPequenoContribuyente'
>;

/** Los dos últimos regímenes ya no existen (julio de 2025): solo se ofrecen si el proveedor ya los tiene. */
export const REGIMENES_DEROGADOS: readonly RegimenDeIvaDeProveedor[] = [
  'pequeno_contribuyente_electronico',
  'contribuyente_agropecuario',
];

/** Régimen de ISR que corresponde al de IVA (igual que el servidor): solo el general escoge; por omisión, utilidades. */
export function regimenIsrPropuesto(
  regimenIva: RegimenDeIvaDeProveedor,
  escogido?: RegimenDeIsrDeProveedor | null,
): RegimenDeIsrDeProveedor | null {
  if (regimenIva === 'no_domiciliado') return 'no_domiciliado';
  if (regimenIva !== 'general') return null;
  return escogido ?? 'utilidades';
}

/**
 * Lo que se propone según el régimen (igual que el servidor): solo el general es sujeto del IVA, si no es agente; el
 * ISR, si es del régimen opcional simplificado; y el 5 % de pequeño contribuyente, solo al pequeño contribuyente.
 */
export const retencionesPropuestas = (base: BaseFiscalDeProveedor): Retenciones => ({
  seLeRetieneIva: base.regimenIva === 'general' && !base.esAgenteDeRetencionIva,
  seLeRetieneIsr: base.regimenIsr === 'opcional_simplificado',
  seLeRetieneIvaPequenoContribuyente: base.regimenIva === 'pequeno_contribuyente',
});

/** Sin datos guardados: régimen general sobre utilidades y que no es agente, con lo que eso propone. */
export function fiscalesDeProveedorPorOmision(): FiscalesDeProveedor {
  const base = { regimenIva: 'general', regimenIsr: 'utilidades', esAgenteDeRetencionIva: false } as const;
  return { ...base, ...retencionesPropuestas(base) };
}

/** Lo guardado pasa al formulario, sin el resto del DTO. */
export const fiscalesDeProveedorDesde = (datos: DatosFiscalesDeProveedor): FiscalesDeProveedor => ({
  regimenIva: datos.regimenIva,
  regimenIsr: datos.regimenIsr,
  esAgenteDeRetencionIva: datos.esAgenteDeRetencionIva,
  seLeRetieneIva: datos.seLeRetieneIva,
  seLeRetieneIsr: datos.seLeRetieneIsr,
  seLeRetieneIvaPequenoContribuyente: datos.seLeRetieneIvaPequenoContribuyente,
});

/** Los regímenes de ISR que se pueden escoger con este régimen de IVA (`[null]` es «No aplica»). */
export function regimenesDeIsrPosibles(regimenIva: RegimenDeIvaDeProveedor): Array<RegimenDeIsrDeProveedor | null> {
  if (regimenIva === 'general') return ['exento', 'opcional_simplificado', 'utilidades'];
  return [regimenIsrPropuesto(regimenIva)];
}

/**
 * Aplica un cambio del régimen (de IVA, de ISR o agente) y vuelve a proponer los tres «se le retiene»: lo que el
 * usuario haya ajustado a mano se pierde, por eso la pantalla lo avisa. Al cambiar de régimen de IVA, el de ISR
 * y el agente se ponen como corresponden al nuevo.
 */
export function conCambioDeRegimen(actual: FiscalesDeProveedor, cambio: Partial<BaseFiscalDeProveedor>) {
  const regimenIva = cambio.regimenIva ?? actual.regimenIva;
  const cambioElIva = regimenIva !== actual.regimenIva;
  const escogido = 'regimenIsr' in cambio ? cambio.regimenIsr : cambioElIva ? undefined : actual.regimenIsr;
  const base: BaseFiscalDeProveedor = {
    regimenIva,
    regimenIsr: regimenIsrPropuesto(regimenIva, escogido),
    esAgenteDeRetencionIva:
      regimenIva === 'general' && (cambio.esAgenteDeRetencionIva ?? actual.esAgenteDeRetencionIva),
  };
  return { ...base, ...retencionesPropuestas(base) };
}

/** Qué «se le retiene» se pueden cambiar con el régimen actual; los demás se bloquean en falso. */
export const retencionesQueAplican = (fiscales: FiscalesDeProveedor) => ({
  iva: fiscales.regimenIva === 'general',
  isr: fiscales.regimenIsr !== null,
  ivaPequenoContribuyente: fiscales.regimenIva === 'pequeno_contribuyente',
});

/** `true` si los tres «se le retiene» son los que propone el régimen (si no, el usuario los ajustó). */
export function retencionesSonLasPropuestas(fiscales: FiscalesDeProveedor): boolean {
  const propuestas = retencionesPropuestas(fiscales);
  return (Object.keys(propuestas) as Array<keyof Retenciones>).every((clave) => propuestas[clave] === fiscales[clave]);
}

const sinoDe = (valor: boolean): string => (valor ? 'Sí' : 'No');

/** Los datos para la ficha, ya con nombres legibles; solo las retenciones que aplican al régimen. */
export function detallesDeProveedor(fiscales: FiscalesDeProveedor): DetalleDeRegistro[] {
  const aplican = retencionesQueAplican(fiscales);
  const isr = fiscales.regimenIsr ? REGIMENES_DE_ISR_DE_PROVEEDOR[fiscales.regimenIsr] : 'No aplica';
  const retenciones: DetalleDeRegistro[] = [];
  if (aplican.iva) {
    retenciones.push({ etiqueta: 'Agente de retención del IVA', valor: sinoDe(fiscales.esAgenteDeRetencionIva) });
    retenciones.push({ etiqueta: 'Se le retiene el IVA', valor: sinoDe(fiscales.seLeRetieneIva) });
  }
  if (aplican.isr) retenciones.push({ etiqueta: 'Se le retiene el ISR', valor: sinoDe(fiscales.seLeRetieneIsr) });
  if (aplican.ivaPequenoContribuyente) {
    retenciones.push({
      etiqueta: 'Se le retiene el IVA de pequeño contribuyente',
      valor: sinoDe(fiscales.seLeRetieneIvaPequenoContribuyente),
    });
  }
  return [
    { etiqueta: 'Régimen de IVA', valor: REGIMENES_DE_IVA_DE_PROVEEDOR[fiscales.regimenIva] },
    { etiqueta: 'Régimen de ISR', valor: isr },
    ...retenciones,
  ];
}
