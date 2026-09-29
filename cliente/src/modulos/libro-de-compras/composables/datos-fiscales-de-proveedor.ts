import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { DatosFiscalesDeProveedor } from '../servicios/libro-de-compras.api';
import { REGIMENES_DE_ISR_DE_PROVEEDOR } from '../textos';

/** Lo que el formulario de Proveedores envía en `secciones['libro-de-compras']`. */
export type FiscalesDeProveedor = Omit<DatosFiscalesDeProveedor, 'proveedorId' | 'guardado'>;

/** Lo que el usuario decide; de aquí se proponen los tres «se le retiene». */
export type BaseFiscalDeProveedor = Pick<
  FiscalesDeProveedor,
  'esPequenoContribuyente' | 'regimenIsr' | 'esAgenteDeRetencionIva'
>;

type Retenciones = Pick<
  FiscalesDeProveedor,
  'seLeRetieneIva' | 'seLeRetieneIsr' | 'seLeRetieneIvaPequenoContribuyente'
>;

/**
 * Lo que se propone según el régimen (igual que el servidor): se le retiene el IVA si no es pequeño contribuyente
 * ni agente; el ISR, si es del régimen opcional simplificado; y el IVA de pequeño contribuyente, si lo es.
 */
export const retencionesPropuestas = (base: BaseFiscalDeProveedor): Retenciones => ({
  seLeRetieneIva: !base.esPequenoContribuyente && !base.esAgenteDeRetencionIva,
  seLeRetieneIsr: base.regimenIsr === 'opcional_simplificado',
  seLeRetieneIvaPequenoContribuyente: base.esPequenoContribuyente,
});

/** Sin datos guardados: régimen sobre utilidades, ni pequeño contribuyente ni agente, con lo que eso propone. */
export function fiscalesDeProveedorPorOmision(): FiscalesDeProveedor {
  const base = { esPequenoContribuyente: false, regimenIsr: 'utilidades', esAgenteDeRetencionIva: false } as const;
  return { ...base, ...retencionesPropuestas(base) };
}

/** Lo guardado pasa al formulario, sin el resto del DTO. */
export const fiscalesDeProveedorDesde = (datos: DatosFiscalesDeProveedor): FiscalesDeProveedor => ({
  esPequenoContribuyente: datos.esPequenoContribuyente,
  regimenIsr: datos.regimenIsr,
  esAgenteDeRetencionIva: datos.esAgenteDeRetencionIva,
  seLeRetieneIva: datos.seLeRetieneIva,
  seLeRetieneIsr: datos.seLeRetieneIsr,
  seLeRetieneIvaPequenoContribuyente: datos.seLeRetieneIvaPequenoContribuyente,
});

/** El pequeño contribuyente no tiene régimen de ISR aparte; quien deja de serlo vuelve a «sobre las utilidades». */
function regimenTrasElCambio(actual: FiscalesDeProveedor, base: BaseFiscalDeProveedor): BaseFiscalDeProveedor {
  if (base.esPequenoContribuyente) {
    return { ...base, regimenIsr: null, esAgenteDeRetencionIva: false };
  }
  return { ...base, regimenIsr: base.regimenIsr ?? (actual.esPequenoContribuyente ? 'utilidades' : actual.regimenIsr) };
}

/**
 * Aplica un cambio del régimen (pequeño contribuyente, régimen de ISR o agente) y vuelve a proponer los tres
 * «se le retiene»: lo que el usuario haya ajustado a mano se pierde, por eso la pantalla lo avisa.
 */
export function conCambioDeRegimen(actual: FiscalesDeProveedor, cambio: Partial<BaseFiscalDeProveedor>) {
  const base = regimenTrasElCambio(actual, {
    esPequenoContribuyente: cambio.esPequenoContribuyente ?? actual.esPequenoContribuyente,
    regimenIsr: 'regimenIsr' in cambio ? (cambio.regimenIsr ?? null) : actual.regimenIsr,
    esAgenteDeRetencionIva: cambio.esAgenteDeRetencionIva ?? actual.esAgenteDeRetencionIva,
  });
  return { ...base, ...retencionesPropuestas(base) };
}

/** `true` si los tres «se le retiene» son los que propone el régimen (si no, el usuario los ajustó). */
export function retencionesSonLasPropuestas(fiscales: FiscalesDeProveedor): boolean {
  const propuestas = retencionesPropuestas(fiscales);
  return (Object.keys(propuestas) as Array<keyof Retenciones>).every((clave) => propuestas[clave] === fiscales[clave]);
}

const sinoDe = (valor: boolean): string => (valor ? 'Sí' : 'No');

/** Los datos para la ficha, ya con nombres legibles. */
export function detallesDeProveedor(fiscales: FiscalesDeProveedor): DetalleDeRegistro[] {
  const regimen = fiscales.regimenIsr
    ? REGIMENES_DE_ISR_DE_PROVEEDOR[fiscales.regimenIsr]
    : 'No aplica (pequeño contribuyente)';
  const retenciones = fiscales.esPequenoContribuyente
    ? [
        {
          etiqueta: 'Se le retiene el IVA de pequeño contribuyente',
          valor: sinoDe(fiscales.seLeRetieneIvaPequenoContribuyente),
        },
      ]
    : [
        { etiqueta: 'Se le retiene el IVA', valor: sinoDe(fiscales.seLeRetieneIva) },
        { etiqueta: 'Se le retiene el ISR', valor: sinoDe(fiscales.seLeRetieneIsr) },
      ];
  return [
    { etiqueta: 'Pequeño contribuyente', valor: sinoDe(fiscales.esPequenoContribuyente) },
    { etiqueta: 'Régimen de ISR', valor: regimen },
    { etiqueta: 'Agente de retención del IVA', valor: sinoDe(fiscales.esAgenteDeRetencionIva) },
    ...retenciones,
  ];
}
