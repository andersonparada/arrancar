import { formatearFecha, formatearFechaHora } from '@/modulos/core/utilidades/formato';
import type { CargoImpreso, ImpresionDeContrasena } from '../../servicios/tipos-de-contrasenas';
import { TIPOS_DE_DOCUMENTO } from '../../textos';
import { etiquetaDeDocumento } from './edicion-de-contrasena';

/** «Factura A-123»: como se lee el cargo en el papel. */
export const nombreDeCargoImpreso = (cargo: Pick<CargoImpreso, 'tipo' | 'serie' | 'numero'>): string =>
  `${TIPOS_DE_DOCUMENTO[cargo.tipo]} ${etiquetaDeDocumento(cargo)}`;

/** El rótulo de las columnas vivas: «al 14/11/2026» (el día de la impresión). */
export const textoAlDia = (alDia: string): string => `al ${formatearFecha(alDia)}`;

/** Razón social si la hay (o el nombre) y, aparte, el nombre comercial solo si es distinto. */
export function lineasDeEmpresa(empresa: ImpresionDeContrasena['empresa']): {
  principal: string;
  comercial: string | null;
} {
  const principal = empresa.razonSocial || empresa.nombre;
  const comercial = empresa.nombreComercial && empresa.nombreComercial !== principal ? empresa.nombreComercial : null;
  return { principal, comercial };
}

/** El pie: quién y cuándo imprimió. */
export function pieDeImpresion(impresion: Pick<ImpresionDeContrasena, 'impresoEn' | 'impresoPorNombre'>): string {
  const cuando = `Impreso el ${formatearFechaHora(impresion.impresoEn)}`;
  return impresion.impresoPorNombre ? `${cuando} por ${impresion.impresoPorNombre}` : cuando;
}

/** La retención por emitir de un cargo, si tiene (la leyenda ya viene armada del servidor). */
export function retencionPorEmitirDe(impresion: ImpresionDeContrasena, documentoId: string): string | null {
  return impresion.retencionesPorEmitir.find((retencion) => retencion.documentoId === documentoId)?.texto ?? null;
}

/** El título de la ventana de impresión (nombre sugerido del PDF al guardar). */
export const tituloDelDocumento = (impresion: Pick<ImpresionDeContrasena, 'contrasena' | 'proveedor'>): string =>
  `Contraseña ${impresion.contrasena.numero} - ${impresion.proveedor.nombre}`;
