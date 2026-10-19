import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type {
  AgenteDeRetencionDeIva,
  DatosFiscalesDeEmpresa,
  RegimenDeIsrDeEmpresa,
  RegimenDeIva,
  TipoDePersona,
} from '../servicios/libro-de-compras.api';
import {
  AGENTES_DE_RETENCION_DE_IVA,
  REGIMENES_DE_ISR_DE_EMPRESA,
  REGIMENES_DE_IVA,
  TIPOS_DE_PERSONA,
} from '../textos';
import { datosPropuestos, puedeSerAgenteDeIva, tieneRegimenDeIsr } from './propuesta-fiscal-de-empresa';

/**
 * Lo que el formulario de Empresas envía en `secciones['libro-de-compras']`. `undefined` no viaja: en
 * `esAgenteDeRetencionIsr` es «sin contestar» y en `vigenteDesde` es «rige la vigencia de hoy»; `null` en
 * `vigenteDesde` es «desde el inicio».
 */
export interface FiscalesDeEmpresa {
  tipoDePersona: TipoDePersona | null;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa | null;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean | undefined;
  vigenteDesde: string | null | undefined;
}

/** Una empresa nueva no tiene persona supuesta: se escoge. Lo demás es lo habitual, y se afina al escoger. */
export const fiscalesDeEmpresaPorOmision = (): FiscalesDeEmpresa => ({
  tipoDePersona: null,
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
  vigenteDesde: undefined,
});

/** Lo guardado pasa al formulario, sin el historial. */
export const fiscalesDeEmpresaDesde = (datos: DatosFiscalesDeEmpresa): FiscalesDeEmpresa => ({
  tipoDePersona: datos.tipoDePersona,
  regimenIva: datos.regimenIva,
  regimenIsr: datos.regimenIsr,
  agenteDeRetencionIva: datos.agenteDeRetencionIva,
  esAgenteDeRetencionIsr: datos.esAgenteDeRetencionIsr,
  vigenteDesde: undefined,
});

/** Lo que la sección necesita saber de lo guardado para preguntar «¿desde cuándo?». */
export interface ContextoFiscalDeEmpresa {
  guardado: boolean;
  /** Hay facturas en los meses de la vigencia de hoy. */
  hayFacturasHoy: boolean;
}

export const contextoSinGuardar = (): ContextoFiscalDeEmpresa => ({ guardado: false, hayFacturasHoy: false });

export const contextoFiscalDe = (datos: DatosFiscalesDeEmpresa): ContextoFiscalDeEmpresa => ({
  guardado: datos.guardado,
  hayFacturasHoy: datos.historial.some((vigencia) => vigencia.vigenteHasta === null && vigencia.conDocumentos),
});

/** Aplica lo que propone la tabla al régimen y la persona escogidos; el agente de IVA solo lo escoge el régimen general. */
function conPropuesta(fiscales: FiscalesDeEmpresa): FiscalesDeEmpresa {
  const { regimenIva, tipoDePersona } = fiscales;
  const agenteDeRetencionIva = puedeSerAgenteDeIva(regimenIva) ? fiscales.agenteDeRetencionIva : 'ninguno';
  if (!tipoDePersona) {
    return {
      ...fiscales,
      agenteDeRetencionIva,
      regimenIsr: tieneRegimenDeIsr(regimenIva) ? fiscales.regimenIsr : null,
    };
  }
  const propuesta = datosPropuestos(regimenIva, tipoDePersona, fiscales.regimenIsr);
  return {
    ...fiscales,
    agenteDeRetencionIva,
    regimenIsr: propuesta.regimenIsr ?? null,
    esAgenteDeRetencionIsr: propuesta.esAgenteDeRetencionIsr,
  };
}

export const conRegimenDeIva = (fiscales: FiscalesDeEmpresa, regimenIva: RegimenDeIva): FiscalesDeEmpresa =>
  conPropuesta({ ...fiscales, regimenIva });

export const conTipoDePersona = (fiscales: FiscalesDeEmpresa, tipoDePersona: TipoDePersona): FiscalesDeEmpresa =>
  conPropuesta({ ...fiscales, tipoDePersona });

export const conRegimenDeIsr = (
  fiscales: FiscalesDeEmpresa,
  regimenIsr: RegimenDeIsrDeEmpresa | null,
): FiscalesDeEmpresa => conPropuesta({ ...fiscales, regimenIsr });

/** Cuando la tabla no propone si lleva contabilidad completa, hay que preguntárselo al usuario. */
export function haceFaltaPreguntarLaContabilidad(fiscales: FiscalesDeEmpresa): boolean {
  const { tipoDePersona, regimenIva, regimenIsr } = fiscales;
  if (!tipoDePersona) return false;
  return datosPropuestos(regimenIva, tipoDePersona, regimenIsr).esAgenteDeRetencionIsr === undefined;
}

type DatosParaLaFicha = Pick<FiscalesDeEmpresa, 'regimenIsr' | 'regimenIva' | 'agenteDeRetencionIva'> & {
  tipoDePersona: TipoDePersona | null;
  esAgenteDeRetencionIsr: boolean | undefined;
};

const SIN_VALOR = '—';
const siONo = (valor: boolean | undefined) => (valor === undefined ? SIN_VALOR : valor ? 'Sí' : 'No');

/** Los datos para la ficha, ya con nombres legibles. */
export function detallesDeEmpresa(fiscales: DatosParaLaFicha): DetalleDeRegistro[] {
  const { tipoDePersona, regimenIsr } = fiscales;
  return [
    { etiqueta: 'Tipo de persona', valor: tipoDePersona ? TIPOS_DE_PERSONA[tipoDePersona] : SIN_VALOR },
    { etiqueta: 'Régimen de IVA', valor: REGIMENES_DE_IVA[fiscales.regimenIva] },
    { etiqueta: 'Régimen de ISR', valor: regimenIsr ? REGIMENES_DE_ISR_DE_EMPRESA[regimenIsr] : 'No aplica' },
    { etiqueta: 'Agente de retención del IVA', valor: AGENTES_DE_RETENCION_DE_IVA[fiscales.agenteDeRetencionIva] },
    {
      etiqueta: 'Lleva contabilidad completa (agente de retención del ISR)',
      valor: siONo(fiscales.esAgenteDeRetencionIsr),
    },
  ];
}
