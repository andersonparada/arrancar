import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type {
  AgenteDeRetencionDeIvaDeCliente,
  DatosFiscalesDeCliente,
} from '../../servicios/datos-fiscales-de-cliente.api';
import { AGENTES_DE_RETENCION_DE_IVA, TEXTOS_FISCALES_DE_CLIENTE as T } from '../../textos-fiscales-de-cliente';

/** Lo que el formulario de Clientes envía en `secciones['libro-de-ventas']`. */
export type FiscalesDeCliente = Omit<DatosFiscalesDeCliente, 'clienteId' | 'guardado'>;

/** Sin datos guardados el cliente no retiene nada: no se supone. */
export const fiscalesDeClientePorOmision = (): FiscalesDeCliente => ({
  agenteDeRetencionIva: 'ninguno',
  exportaProductosAgropecuarios: false,
  retieneIsr: false,
  retieneIvaAPequenoContribuyente: false,
});

/** Lo guardado pasa al formulario, sin el resto del DTO. */
export const fiscalesDeClienteDesde = (datos: DatosFiscalesDeCliente): FiscalesDeCliente => ({
  agenteDeRetencionIva: datos.agenteDeRetencionIva,
  exportaProductosAgropecuarios: datos.exportaProductosAgropecuarios,
  retieneIsr: datos.retieneIsr,
  retieneIvaAPequenoContribuyente: datos.retieneIvaAPequenoContribuyente,
});

/**
 * Aplica un cambio y apaga lo que ya no cabe: quien deja de ser agente de retención del IVA ya no retiene el IVA de
 * pequeño contribuyente, y solo un exportador compra productos agropecuarios para exportarlos. Así el formulario
 * nunca envía una combinación que el servidor rechazaría.
 */
export function conCambioFiscal(actual: FiscalesDeCliente, cambio: Partial<FiscalesDeCliente>): FiscalesDeCliente {
  const nuevo = { ...actual, ...cambio };
  if (nuevo.agenteDeRetencionIva === 'ninguno') nuevo.retieneIvaAPequenoContribuyente = false;
  if (nuevo.agenteDeRetencionIva !== 'exportador') nuevo.exportaProductosAgropecuarios = false;
  return nuevo;
}

/** Qué opciones se pueden marcar con el agente escogido; las demás se ven apagadas y bloqueadas. */
export const opcionesQueAplican = (fiscales: FiscalesDeCliente) => ({
  exportaProductosAgropecuarios: fiscales.agenteDeRetencionIva === 'exportador',
  retieneIvaAPequenoContribuyente: fiscales.agenteDeRetencionIva !== 'ninguno',
});

/** Las opciones del selector de agente: primero «No es agente» y luego las demás por nombre. */
export function opcionesDeAgente(): { valor: AgenteDeRetencionDeIvaDeCliente; texto: string }[] {
  const ordenadas = (Object.entries(AGENTES_DE_RETENCION_DE_IVA) as [AgenteDeRetencionDeIvaDeCliente, string][])
    .filter(([valor]) => valor !== 'ninguno')
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: 'ninguno', texto: AGENTES_DE_RETENCION_DE_IVA.ninguno }, ...ordenadas];
}

/**
 * Qué se le va a proponer al registrar una venta, en palabras. La propuesta real la calcula el servidor al registrar
 * (depende del régimen de la empresa en el mes); esto solo la explica. Vacío si no retiene nada.
 */
export function explicacionDeLoQueRetiene(fiscales: FiscalesDeCliente): string[] {
  const lineas: string[] = [];
  if (fiscales.agenteDeRetencionIva !== 'ninguno') lineas.push(T.retieneIva);
  if (fiscales.exportaProductosAgropecuarios) lineas.push(T.retieneIvaExportador);
  if (fiscales.retieneIvaAPequenoContribuyente) lineas.push(T.retieneIvaAPequenoContribuyente);
  if (fiscales.retieneIsr) lineas.push(T.retieneIsr);
  return lineas;
}

const sinoDe = (valor: boolean): string => (valor ? 'Sí' : 'No');

/** Los datos para la ficha, con nombres legibles. */
export function detallesDeCliente(fiscales: FiscalesDeCliente): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Agente de retención del IVA', valor: AGENTES_DE_RETENCION_DE_IVA[fiscales.agenteDeRetencionIva] },
    { etiqueta: 'Exporta productos agropecuarios', valor: sinoDe(fiscales.exportaProductosAgropecuarios) },
    { etiqueta: 'Retiene ISR', valor: sinoDe(fiscales.retieneIsr) },
    { etiqueta: 'Retiene el IVA de pequeño contribuyente', valor: sinoDe(fiscales.retieneIvaAPequenoContribuyente) },
  ];
}
