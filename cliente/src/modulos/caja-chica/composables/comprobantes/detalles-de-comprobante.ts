import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { TEXTOS_DE_DESTINO_DEL_FALTANTE } from '../../textos';
import type { Comprobante, ComprobanteDeLaBandeja, FiltroDeBandeja } from '../../servicios/tipos-de-comprobantes';

/** El nombre de un comprobante: «Factura A-123», «Nota de crédito …» o «Vale de gasto N.º 7». */
export function tituloDeComprobante(comprobante: Comprobante): string {
  if (comprobante.clase === 'vale_de_gasto') return `Vale de gasto N.º ${comprobante.numero ?? '—'}`;
  const documento = comprobante.documento;
  if (!documento) return comprobante.descripcion ?? (comprobante.clase === 'faltante' ? 'Faltante' : 'Sobrante');
  const numero = documento.serie ? `${documento.serie}-${documento.numero}` : documento.numero;
  return `${comprobante.esNotaDeCredito ? 'Nota de crédito' : documento.tipo} ${numero}`;
}

/** Quién emitió el documento, a quién se pagó el vale o, en un faltante, qué se hace con él. */
export function terceroDelComprobante(comprobante: Comprobante): string {
  if (comprobante.destinoDelFaltante) return TEXTOS_DE_DESTINO_DEL_FALTANTE[comprobante.destinoDelFaltante];
  if (comprobante.clase === 'sobrante') return 'Sobró efectivo en el arqueo';
  return comprobante.documento?.proveedorNombre ?? comprobante.pagadoA ?? '—';
}

/** Lo que dice la primera columna de datos: el proveedor, a quién se pagó o el destino del faltante. */
export function etiquetaDelTercero(comprobante: Comprobante): string {
  if (comprobante.clase === 'faltante') return 'Qué se hace';
  if (comprobante.clase === 'sobrante') return 'Origen';
  return comprobante.clase === 'vale_de_gasto' ? 'Pagado a' : 'Proveedor';
}

/** Las marcas que el servidor puso en un comprobante, para mostrarlas como insignias. */
export function marcasDelComprobante(comprobante: Comprobante): { texto: string; tono: 'trigo' | 'rojo' | 'tierra' }[] {
  const marcas: { texto: string; tono: 'trigo' | 'rojo' | 'tierra' }[] = [];
  if (comprobante.conRetencion)
    marcas.push({ texto: `Retención ${formatearMonto(comprobante.montoRetenido)}`, tono: 'trigo' });
  if (comprobante.sobreElTope) marcas.push({ texto: 'Sobre el tope', tono: 'trigo' });
  if (comprobante.sinBancarizar) marcas.push({ texto: 'Sin bancarizar', tono: 'rojo' });
  if (comprobante.documento && !comprobante.documento.enElLibro)
    marcas.push({ texto: 'Fuera del libro', tono: 'tierra' });
  if (comprobante.estado === 'anulado') marcas.push({ texto: 'Anulado', tono: 'rojo' });
  if (comprobante.reposicionNumero !== null) {
    marcas.push({ texto: `Repuesto en la reposición ${comprobante.reposicionNumero}`, tono: 'tierra' });
  }
  return marcas;
}

/** Los datos de una fila de comprobante. */
export function detallesDeComprobante(comprobante: Comprobante): DetalleDeRegistro[] {
  const signo = comprobante.resta ? '−' : '';
  return [
    { etiqueta: 'Fecha', valor: formatearFecha(comprobante.fecha) },
    { etiqueta: 'Sale del fondo', valor: `${signo}${formatearMonto(comprobante.monto)}` },
    {
      etiqueta: etiquetaDelTercero(comprobante),
      valor: terceroDelComprobante(comprobante),
    },
  ];
}

/** Los datos de un documento de la bandeja: lo que dice la factura y lo que saldría del fondo. */
export function detallesDeLaBandeja(documento: ComprobanteDeLaBandeja): DetalleDeRegistro[] {
  const detalles = detallesDeComprobante(documento);
  if (documento.documento) {
    detalles.splice(1, 0, {
      etiqueta: 'Total de la factura',
      valor: formatearMonto(documento.documento.total),
    });
  }
  return detalles;
}

/** Cuántos filtros están puestos, para decirlo junto al botón. */
export const cantidadDeFiltros = (filtro: FiltroDeBandeja): number =>
  [filtro.proveedorId, filtro.desde, filtro.hasta, filtro.conRetencion].filter((valor) => valor !== undefined).length;

/** Aplica los filtros de la bandeja; la bandeja se trae completa y así las opciones del filtro no se encogen. */
export function filtrarBandeja(
  documentos: readonly ComprobanteDeLaBandeja[],
  filtro: FiltroDeBandeja,
): ComprobanteDeLaBandeja[] {
  return documentos.filter(
    (d) =>
      (filtro.proveedorId === undefined || d.proveedorId === filtro.proveedorId) &&
      (filtro.desde === undefined || d.fecha >= filtro.desde) &&
      (filtro.hasta === undefined || d.fecha <= filtro.hasta) &&
      (filtro.conRetencion === undefined || d.conRetencion === filtro.conRetencion),
  );
}

/** Los proveedores que aparecen en la bandeja, por nombre, para el filtro. */
export function proveedoresDeLaBandeja(
  documentos: readonly ComprobanteDeLaBandeja[],
): { id: string; nombre: string }[] {
  const vistos = new Map<string, string>();
  for (const d of documentos) {
    if (d.proveedorId) vistos.set(d.proveedorId, d.documento?.proveedorNombre ?? 'Proveedor');
  }
  return [...vistos].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
