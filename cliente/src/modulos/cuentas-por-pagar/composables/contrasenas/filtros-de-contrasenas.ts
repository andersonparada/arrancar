import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  ConsultaDeContrasenas,
  ContrasenaResumen,
  EstadoBuscadoDeContrasena,
} from '../../servicios/tipos-de-contrasenas';

export const CONTRASENAS_POR_PAGINA = 24;

/** Lo que el usuario escoge en «Contraseñas»; el texto vacío significa «todos». */
export interface FiltrosDeContrasenas {
  proveedorId: string;
  estado: EstadoBuscadoDeContrasena;
  desde: string;
  hasta: string;
  pagoDesde: string;
  pagoHasta: string;
}

/** Al abrir: las contraseñas vigentes, que son las que se siguen cobrando. */
export const filtrosInicialesDeContrasenas = (): FiltrosDeContrasenas => ({
  proveedorId: '',
  estado: 'vigente',
  desde: '',
  hasta: '',
  pagoDesde: '',
  pagoHasta: '',
});

export const OPCIONES_DE_ESTADO_DE_CONTRASENA: { valor: EstadoBuscadoDeContrasena; texto: string }[] = [
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'anulada', texto: 'Anuladas' },
  { valor: 'todas', texto: 'Todas' },
];

/** Lo que se manda al servidor: nada de lo que quedó en «todos». */
export function consultaDeContrasenas(filtros: FiltrosDeContrasenas, pagina: number): ConsultaDeContrasenas {
  return {
    proveedorId: filtros.proveedorId || undefined,
    estado: filtros.estado,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
    pagoDesde: filtros.pagoDesde || undefined,
    pagoHasta: filtros.pagoHasta || undefined,
    pagina,
    limite: CONTRASENAS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de la forma de abrir hay. */
export function cantidadDeFiltrosDeContrasenas(filtros: FiltrosDeContrasenas): number {
  const puestos = [filtros.proveedorId, filtros.desde, filtros.hasta, filtros.pagoDesde, filtros.pagoHasta];
  return puestos.filter(Boolean).length + (filtros.estado === 'vigente' ? 0 : 1);
}

/** El texto corto de la marca de la tarjeta: lo anulado pesa más que el pago vencido. */
export function marcaDeContrasena(contrasena: ContrasenaResumen): string | undefined {
  if (contrasena.estado === 'anulada') return 'Anulada';
  return contrasena.pagoVencido ? 'Pago vencido' : undefined;
}

/** Los datos de una tarjeta de la lista. */
export function detallesDeContrasena(contrasena: ContrasenaResumen) {
  return [
    { etiqueta: 'Proveedor', valor: contrasena.proveedorNombre },
    { etiqueta: 'Fecha', valor: formatearFecha(contrasena.fecha) },
    { etiqueta: 'Pago prometido', valor: formatearFecha(contrasena.fechaDePago) },
    { etiqueta: 'Documentos', valor: String(contrasena.documentos) },
    { etiqueta: 'Saldo', valor: formatearMonto(contrasena.saldo) },
  ];
}
