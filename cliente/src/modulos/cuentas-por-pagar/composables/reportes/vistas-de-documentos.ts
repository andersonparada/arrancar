import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { OrigenDelDocumento } from '../../servicios/tipos';
import type { AutorizacionDelReporte, EstadoDePago, TipoDeCargo } from '../../servicios/tipos-de-reportes';
import { primerDiaDelMes, sumarDias } from './fechas-de-reportes';
import { OPCIONES_DE_AUTORIZACION } from './filtros-de-saldos';

export const DIAS_POR_VENCER = 7;
/** Lo máximo que se imprime de una vez; con más, el filtro se acota o se usa Excel (CP5-h). */
export const TOPE_DE_IMPRESION = 2000;
export const FILAS_POR_PAGINA = 50;

export type VistaDeDocumentos =
  | 'pendientes'
  | 'vencidos'
  | 'por_vencer'
  | 'autorizados_sin_contrasena'
  | 'estado_de_pago'
  | 'retenciones_por_practicar';

/** Lo que se elige en R2; los textos vacíos significan «todos». */
export interface FiltrosDeDocumentos {
  vista: VistaDeDocumentos;
  corte: string;
  proveedorId: string;
  autorizacion: AutorizacionDelReporte;
  tipo: TipoDeCargo | '';
  origen: OrigenDelDocumento | '';
  vencidos: boolean;
  venceHasta: string;
  sinContrasena: boolean;
  estadoDePago: EstadoDePago | '';
  emitidosDesde: string;
  emitidosHasta: string;
  conRetencionesPorPracticar: boolean;
}

export const VISTAS_DE_DOCUMENTOS: { valor: VistaDeDocumentos; texto: string; ayuda: string }[] = [
  { valor: 'pendientes', texto: 'Pendientes de pago', ayuda: 'Los cargos que tienen saldo al corte.' },
  { valor: 'vencidos', texto: 'Vencidos', ayuda: 'Cargos con saldo cuyo vencimiento es anterior al corte.' },
  {
    valor: 'por_vencer',
    texto: 'Por vencer',
    ayuda: `Cargos con saldo que vencen desde el corte y en los próximos ${DIAS_POR_VENCER} días.`,
  },
  {
    valor: 'autorizados_sin_contrasena',
    texto: 'Autorizados sin contraseña',
    ayuda: 'Hoy: facturas autorizadas con saldo que todavía no están en una contraseña de pago vigente.',
  },
  {
    valor: 'estado_de_pago',
    texto: 'Estado de pago',
    ayuda: 'Cargos emitidos en un rango, según estén pagados, en parte, comprometidos o pendientes.',
  },
  {
    valor: 'retenciones_por_practicar',
    texto: 'Retenciones por practicar (saldos iniciales)',
    ayuda: 'Hoy: saldos iniciales con retenciones que la empresa todavía no practicó.',
  },
];

export const OPCIONES_DE_ESTADO_DE_PAGO: { valor: EstadoDePago | ''; texto: string }[] = [
  { valor: '', texto: 'Cualquiera con saldo' },
  { valor: 'pagado', texto: 'Pagado' },
  { valor: 'en_parte', texto: 'Pagado en parte' },
  { valor: 'comprometido_en_parte', texto: 'Comprometido en parte (cheque posfechado)' },
  { valor: 'comprometido', texto: 'Comprometido (cheque posfechado)' },
  { valor: 'pendiente', texto: 'Pendiente' },
];

export const TEXTOS_DE_ESTADO_DE_PAGO: Record<EstadoDePago, string> = {
  pagado: 'Pagado',
  en_parte: 'Pagado en parte',
  comprometido_en_parte: 'Comprometido en parte',
  comprometido: 'Comprometido',
  pendiente: 'Pendiente',
};

export const TEXTOS_DE_TRAMO: Record<string, string> = {
  por_vencer: 'Por vencer',
  de_1_a_30: '1 a 30 días',
  de_31_a_60: '31 a 60 días',
  de_61_a_90: '61 a 90 días',
  mas_de_90: 'Más de 90 días',
  sin_vencimiento: 'Sin vencimiento',
};

/** Todos los filtros en blanco, con el corte de hoy (o el que se pidió desde otro reporte). */
export const filtrosDeDocumentosVacios = (hoy: string, corte = ''): FiltrosDeDocumentos => ({
  vista: 'pendientes',
  corte: corte || hoy,
  proveedorId: '',
  autorizacion: 'todos',
  tipo: '',
  origen: '',
  vencidos: false,
  venceHasta: '',
  sinContrasena: false,
  estadoDePago: '',
  emitidosDesde: '',
  emitidosHasta: '',
  conRetencionesPorPracticar: false,
});

/** Lo que cada vista pone sobre los filtros; el usuario puede cambiarlo después. */
function preajusteDe(vista: VistaDeDocumentos, hoy: string, corte: string): Partial<FiltrosDeDocumentos> {
  const preajustes: Record<VistaDeDocumentos, Partial<FiltrosDeDocumentos>> = {
    pendientes: {},
    vencidos: { vencidos: true },
    por_vencer: { venceHasta: sumarDias(corte, DIAS_POR_VENCER) },
    autorizados_sin_contrasena: { corte: hoy, autorizacion: 'autorizados', sinContrasena: true },
    estado_de_pago: { emitidosDesde: primerDiaDelMes(hoy), emitidosHasta: hoy, estadoDePago: 'pendiente' },
    retenciones_por_practicar: { corte: hoy, origen: 'saldo_inicial', conRetencionesPorPracticar: true },
  };
  return preajustes[vista];
}

/** Cambia de vista: se quitan los filtros propios de la anterior, se conservan el proveedor y el corte. */
export function aplicarVista(actual: FiltrosDeDocumentos, vista: VistaDeDocumentos, hoy: string): FiltrosDeDocumentos {
  const base = { ...filtrosDeDocumentosVacios(hoy, actual.corte), proveedorId: actual.proveedorId, vista };
  return { ...base, ...preajusteDe(vista, hoy, base.corte) };
}

/** Lo que se manda al servidor para una página; con `limite` 2,000 sirve para imprimir. */
export function consultaDeDocumentos(filtros: FiltrosDeDocumentos, pagina: number, limite: number): Consulta {
  const { vista, ...resto } = filtros;
  const consulta: Consulta = { vista, pagina, limite };
  for (const [clave, valor] of Object.entries(resto)) {
    if (valor === '' || valor === false || (clave === 'autorizacion' && valor === 'todos')) continue;
    consulta[clave] = valor;
  }
  return consulta;
}

/** Lo mismo sin página ni límite: Excel lleva todo lo filtrado. */
export function consultaParaExportar(filtros: FiltrosDeDocumentos): Consulta {
  const { pagina: _pagina, limite: _limite, ...consulta } = consultaDeDocumentos(filtros, 1, 1);
  return consulta;
}

/** Cuántos filtros se salen de lo que pone la vista elegida (para ofrecer «Quitar filtros»). */
export function cantidadDeFiltrosDeDocumentos(filtros: FiltrosDeDocumentos, hoy: string): number {
  const porOmision = aplicarVista(filtrosDeDocumentosVacios(hoy), filtros.vista, hoy);
  const claves = Object.keys(filtros) as (keyof FiltrosDeDocumentos)[];
  return claves.filter((clave) => clave !== 'vista' && filtros[clave] !== porOmision[clave]).length;
}

export interface EstadoDeImpresion {
  /** Se puede mandar a imprimir ya. */
  puede: boolean;
  /** Qué decirle al usuario cuando no se puede. */
  mensaje: string;
}

/** Imprimir trae todo lo filtrado en una sola petición, hasta 2,000 filas; con más se acota el filtro o se exporta. */
export function estadoDeImpresion(total: number): EstadoDeImpresion {
  if (total === 0) return { puede: false, mensaje: 'No hay filas que imprimir con este filtro.' };
  if (total > TOPE_DE_IMPRESION) {
    const mensaje = `Son ${total} filas: acote el filtro o use Excel (se imprimen hasta ${TOPE_DE_IMPRESION}).`;
    return { puede: false, mensaje };
  }
  return { puede: true, mensaje: '' };
}

const lineaDeEmision = ({ emitidosDesde, emitidosHasta }: FiltrosDeDocumentos): string =>
  emitidosDesde || emitidosHasta
    ? `Emitidos del ${formatearFecha(emitidosDesde)} al ${formatearFecha(emitidosHasta)}`
    : '';

/** Las líneas del encabezado impreso de R2. */
export function lineasDeImpresionDeDocumentos(filtros: FiltrosDeDocumentos, proveedor: string | null): string[] {
  const vista = VISTAS_DE_DOCUMENTOS.find((v) => v.valor === filtros.vista)?.texto ?? '';
  const autorizacion = OPCIONES_DE_AUTORIZACION.find((o) => o.valor === filtros.autorizacion)?.texto ?? '';
  return [
    `${vista}, saldos al ${formatearFecha(filtros.corte)}`,
    `Proveedor: ${proveedor ?? 'todos'}`,
    `Documentos: ${autorizacion}`,
    filtros.venceHasta ? `Vencen hasta el ${formatearFecha(filtros.venceHasta)}` : '',
    lineaDeEmision(filtros),
  ].filter(Boolean);
}
