import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { TipoDeDocumento } from '../../servicios/documentos.api';
import type {
  FacturaAnteriorSolicitada,
  FacturaAnteriorSugerida,
  MotivoDeFacturaAnterior,
} from '../../servicios/facturas-anteriores.api';
import { TIPOS_DE_DOCUMENTO } from '../../textos-de-documentos';
import { montoEnTexto } from './lineas-del-documento';

type Valor = string | number | null | undefined;

/** De dónde sale la factura que corrige una nota: una del libro de Arrancar o una del sistema anterior. */
export type OrigenDeLaFactura = 'libro' | 'anterior';

/** El valor que representa «una factura del sistema anterior» en el selector «Factura que corrige». */
export const VALOR_FACTURA_ANTERIOR = 'sistema-anterior';

/** La factura del sistema anterior tal como la escribe el usuario; el dinero puede ser número o texto. */
export interface FacturaAnteriorEnEdicion {
  tipo: TipoDeDocumento;
  serie: string;
  numero: string;
  fechaEmision: string;
  autorizacionFel: string;
  total: Valor;
  iva: Valor;
  dioCredito: boolean;
  /** Solo si no dio crédito. */
  motivoSinCredito: MotivoDeFacturaAnterior | null;
  /** Obligatorio con «otra causa». */
  detalleDelMotivo: string;
  debitosAnterioresTotal: Valor;
  debitosAnterioresIva: Valor;
}

/** Las familias de factura que admiten notas, por nombre, para elegir el tipo de la factura anterior. */
const FAMILIAS: TipoDeDocumento[] = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
];

export const opcionesDeTipoDeFacturaAnterior = () =>
  FAMILIAS.map((valor) => ({ valor, texto: TIPOS_DE_DOCUMENTO[valor] })).sort((a, b) =>
    a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }),
  );

/** Los motivos que el usuario puede escribir; el de una familia sin IVA lo pone el servidor. */
export const MOTIVOS_DE_FACTURA_ANTERIOR: { valor: MotivoDeFacturaAnterior; texto: string; ayuda: string | null }[] = [
  { valor: 'fuera_de_plazo', texto: 'Fuera de plazo', ayuda: null },
  { valor: 'no_vinculado', texto: 'No vinculado a ventas gravadas', ayuda: null },
  { valor: 'exento', texto: 'Exenta', ayuda: 'Una factura exenta no lleva IVA: escriba 0 en el IVA.' },
  { valor: 'empresa_sin_credito', texto: 'La empresa no tenía crédito fiscal', ayuda: null },
  {
    valor: 'otra_causa_sin_credito',
    texto: 'Otra causa',
    ayuda: 'Explique la causa abajo: queda guardada con la nota y el IVA se suma al costo.',
  },
];

/** Una factura anterior vacía: factura, que dio crédito fiscal. */
export function facturaAnteriorVacia(): FacturaAnteriorEnEdicion {
  return {
    tipo: 'factura',
    serie: '',
    numero: '',
    fechaEmision: '',
    autorizacionFel: '',
    total: '',
    iva: '',
    dioCredito: true,
    motivoSinCredito: null,
    detalleDelMotivo: '',
    debitosAnterioresTotal: '',
    debitosAnterioresIva: '',
  };
}

const esMotivoEscribible = (motivo: string | null): motivo is MotivoDeFacturaAnterior =>
  MOTIVOS_DE_FACTURA_ANTERIOR.some(({ valor }) => valor === motivo);

/** Llena la factura anterior con una sugerencia del servidor (ya usada o de la bandeja). */
export function facturaDesdeSugerencia(sugerida: FacturaAnteriorSugerida): FacturaAnteriorEnEdicion {
  const motivo = esMotivoEscribible(sugerida.motivoSinCredito) ? sugerida.motivoSinCredito : null;
  const montoDeDebito = (monto: string) => (Number(monto) === 0 ? '' : monto);
  return {
    tipo: sugerida.tipo,
    serie: sugerida.serie ?? '',
    numero: sugerida.numero,
    fechaEmision: sugerida.fechaEmision,
    autorizacionFel: sugerida.autorizacionFel ?? '',
    total: sugerida.total,
    iva: sugerida.iva,
    dioCredito: motivo === null,
    motivoSinCredito: motivo,
    detalleDelMotivo: sugerida.detalleDelMotivo ?? '',
    debitosAnterioresTotal: montoDeDebito(sugerida.notasDeDebitoAnterioresTotal),
    debitosAnterioresIva: montoDeDebito(sugerida.notasDeDebitoAnterioresIva),
  };
}

/** Cómo se muestra una sugerencia: «A-123 · 05/01/2026 · Q1,200.00». */
export function textoDeSugerencia(sugerida: FacturaAnteriorSugerida): string {
  const numero = sugerida.serie ? `${sugerida.serie}-${sugerida.numero}` : sugerida.numero;
  return `${numero} · ${formatearFecha(sugerida.fechaEmision)} · ${formatearMonto(sugerida.total)}`;
}

/** El motivo y su detalle que viajan: sin crédito el motivo elegido; «otra causa» lleva su detalle. */
function motivoDelCuerpo(factura: FacturaAnteriorEnEdicion) {
  const motivo = factura.dioCredito ? null : factura.motivoSinCredito;
  const detalle = motivo === 'otra_causa_sin_credito' ? textoONulo(factura.detalleDelMotivo) : null;
  return { motivo, detalle };
}

/** Lo que falta de la factura anterior, en lenguaje del usuario. */
export function pendientesDeFacturaAnterior(factura: FacturaAnteriorEnEdicion): string[] {
  const { motivo, detalle } = motivoDelCuerpo(factura);
  const pendientes: [boolean, string][] = [
    [factura.numero.trim() === '', 'escribir el número de la factura del sistema anterior'],
    [factura.fechaEmision === '', 'poner la fecha de la factura del sistema anterior'],
    [montoEnTexto(factura.total) === null, 'escribir el total de la factura del sistema anterior'],
    [montoEnTexto(factura.iva) === null, 'escribir el IVA de la factura del sistema anterior (0 si no tiene)'],
    [!factura.dioCredito && motivo === null, 'decir por qué la factura anterior no dio crédito fiscal'],
    [motivo === 'otra_causa_sin_credito' && detalle === null, 'explicar la otra causa por la que no dio crédito'],
  ];
  return pendientes.filter(([falta]) => falta).map(([, texto]) => texto);
}

/** La factura anterior lista para el cuerpo; `null` mientras falte algo (los avisos y errores los da el servidor). */
export function cuerpoDeFacturaAnterior(factura: FacturaAnteriorEnEdicion): FacturaAnteriorSolicitada | null {
  const total = montoEnTexto(factura.total);
  const iva = montoEnTexto(factura.iva);
  if (pendientesDeFacturaAnterior(factura).length > 0 || total === null || iva === null) return null;
  const { motivo, detalle } = motivoDelCuerpo(factura);
  return {
    tipo: factura.tipo,
    serie: textoONulo(factura.serie),
    numero: factura.numero.trim(),
    fechaEmision: factura.fechaEmision,
    autorizacionFel: textoONulo(factura.autorizacionFel),
    total,
    iva,
    notasDeDebitoAnterioresTotal: montoEnTexto(factura.debitosAnterioresTotal) ?? '0.00',
    notasDeDebitoAnterioresIva: montoEnTexto(factura.debitosAnterioresIva) ?? '0.00',
    motivoSinCredito: motivo,
    detalleDelMotivo: detalle,
  };
}

/** Lo que se ve en el selector «Factura que corrige»: la factura del libro elegida o «del sistema anterior». */
export function valorDelSelectorDeFactura(
  origen: OrigenDeLaFactura,
  documentoAfectadoId: string | null,
): string | null {
  return origen === 'anterior' ? VALOR_FACTURA_ANTERIOR : documentoAfectadoId;
}

/** Lo que cambia al elegir en el selector: una factura del libro o «del sistema anterior» (nunca las dos). */
export function elegirLaFacturaQueCorrige(valor: string | null): {
  origenDeLaFactura: OrigenDeLaFactura;
  documentoAfectadoId: string | null;
} {
  if (valor === VALOR_FACTURA_ANTERIOR) return { origenDeLaFactura: 'anterior', documentoAfectadoId: null };
  return { origenDeLaFactura: 'libro', documentoAfectadoId: valor };
}

/** La opción de «factura del sistema anterior» del selector, con la fecha de inicio; no hay sin ella. */
export function opcionDeFacturaAnterior(fechaDeInicio: string | null) {
  if (!fechaDeInicio) return [];
  return [
    {
      valor: VALOR_FACTURA_ANTERIOR,
      texto: `Una factura del sistema anterior (antes del ${formatearFecha(fechaDeInicio)})`,
    },
  ];
}

/** El día anterior a una fecha `AAAA-MM-DD`: la última que puede tener una factura del sistema anterior. */
export function diaAnterior(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}
