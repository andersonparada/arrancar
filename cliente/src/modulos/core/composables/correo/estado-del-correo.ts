import type { CorreoFicha, CorreoResumen, EstadoDelCorreo } from '../../servicios/correos.api';
import type { OpcionBuscable } from '../../utilidades/busqueda-de-opciones';
import { formatearFechaHora } from '../../utilidades/formato';

type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

const NOMBRES_DEL_ESTADO: Record<EstadoDelCorreo, string> = {
  pendiente: 'Pendiente',
  enviando: 'Enviando',
  enviado: 'Enviado',
  fallido: 'No se pudo enviar',
  cancelado: 'Cancelado',
};

const TONOS_DEL_ESTADO: Record<EstadoDelCorreo, Tono> = {
  pendiente: 'trigo',
  enviando: 'trigo',
  enviado: 'campo',
  fallido: 'rojo',
  cancelado: 'tierra',
};

/** El estado como lo lee la empresa; un pendiente que ya falló alguna vez dice que se reintentará. */
export function nombreDelEstado(correo: Pick<CorreoResumen, 'estado' | 'intentos'>): string {
  if (correo.estado === 'pendiente' && correo.intentos > 0) return 'Pendiente: se reintentará';
  return NOMBRES_DEL_ESTADO[correo.estado];
}

export const tonoDelEstado = (estado: EstadoDelCorreo): Tono => TONOS_DEL_ESTADO[estado];

export const ESTADOS_PARA_FILTRAR: OpcionBuscable<EstadoDelCorreo | ''>[] = [
  { valor: '', texto: 'Todos los estados' },
  ...(Object.keys(NOMBRES_DEL_ESTADO) as EstadoDelCorreo[]).map((estado) => ({
    valor: estado,
    texto: NOMBRES_DEL_ESTADO[estado],
  })),
];

/** A quién va, en una línea: la primera dirección y cuántas más («ana@x.com y 2 más»). */
export function resumenDeDestinatarios(correo: Pick<CorreoResumen, 'destinatarios'>): string {
  const [primero, ...resto] = correo.destinatarios;
  if (!primero) return 'Sin destinatarios';
  return resto.length === 0 ? primero.direccion : `${primero.direccion} y ${resto.length} más`;
}

/** Solo un correo que aún no sale se puede cancelar. */
export const sePuedeCancelar = (correo: Pick<CorreoResumen, 'estado'>): boolean => correo.estado === 'pendiente';

/** Solo uno que falló y conserva su contenido se puede volver a intentar. */
export const sePuedeReintentar = (correo: Pick<CorreoFicha, 'estado' | 'contenidoDepurado'>): boolean =>
  correo.estado === 'fallido' && !correo.contenidoDepurado;

/**
 * La fecha que importa de cada estado: cuándo se envió, cuándo se cancelaron, cuándo se reintentará o, si no, cuándo
 * se encoló.
 */
export function fechaDelEstado(correo: CorreoResumen): string {
  if (correo.estado === 'enviado' && correo.enviadoEn) return `Enviado el ${formatearFechaHora(correo.enviadoEn)}`;
  if (correo.estado === 'cancelado' && correo.canceladoEn)
    return `Cancelado el ${formatearFechaHora(correo.canceladoEn)}`;
  if (correo.estado === 'pendiente' && correo.proximoIntento) {
    return `Se intentará desde ${formatearFechaHora(correo.proximoIntento)}`;
  }
  return `Creado el ${formatearFechaHora(correo.creadoEn)}`;
}

/** «1 a 50 de 120», para el pie de una lista paginada (`pagina` empieza en 1). */
export function rangoDeLaPagina(pagina: number, limite: number, total: number): string {
  if (total === 0) return 'Sin resultados';
  const desde = (pagina - 1) * limite + 1;
  return `${desde} a ${Math.min(pagina * limite, total)} de ${total}`;
}

export const totalDePaginas = (limite: number, total: number): number => Math.max(1, Math.ceil(total / limite));
