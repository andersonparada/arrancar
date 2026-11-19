import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Fondo, FondoResumen } from '../../servicios/tipos-de-fondos';

/** Lo que dice la tarjeta de un fondo en la lista: el dinero que tiene y el que falta reponer. */
export function detallesDeLaTarjeta(fondo: FondoResumen): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Custodio', valor: fondo.custodio ?? 'Sin custodio' },
    { etiqueta: 'Localidad', valor: fondo.localidadNombre ?? 'Sin localidad' },
    { etiqueta: 'Monto del fondo', valor: formatearMonto(fondo.monto) },
    { etiqueta: 'Efectivo esperado', valor: formatearMonto(fondo.efectivoEsperado) },
    { etiqueta: 'Pendiente de reponer', valor: formatearMonto(fondo.pendienteDeReponer) },
    { etiqueta: 'Último arqueo', valor: fondo.ultimoArqueo ? formatearFecha(fondo.ultimoArqueo) : 'Nunca' },
  ];
}

/** Las partes de la ecuación del fondo, tal como las calculó el servidor; no se recalcula nada aquí. */
export function partesDeLaEcuacion(fondo: FondoResumen): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Efectivo esperado en caja', valor: formatearMonto(fondo.efectivoEsperado) },
    { etiqueta: 'Comprobantes pendientes de reponer', valor: formatearMonto(fondo.pendienteDeReponer) },
    { etiqueta: 'Vales provisionales abiertos', valor: formatearMonto(fondo.valesAbiertos) },
    { etiqueta: 'Monto del fondo', valor: formatearMonto(fondo.monto) },
  ];
}

/** Los datos fijos de la ficha. */
export function detallesDeLaFicha(fondo: Fondo): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Estado', valor: textoDelEstado(fondo) },
    { etiqueta: 'Custodio', valor: fondo.custodio ?? 'Sin custodio' },
    { etiqueta: 'Localidad', valor: fondo.localidadNombre ?? 'Sin localidad' },
    { etiqueta: 'Apertura', valor: formatearFecha(fondo.fechaDeApertura) },
    {
      etiqueta: 'Tope por comprobante',
      valor: fondo.topePorComprobante ? formatearMonto(fondo.topePorComprobante) : 'El de la empresa',
    },
  ];
  if (fondo.cuentaBancariaNombre) detalles.push({ etiqueta: 'Cuenta para reponer', valor: fondo.cuentaBancariaNombre });
  if (fondo.fechaDeCierre) {
    detalles.push({ etiqueta: 'Cierre', valor: formatearFecha(fondo.fechaDeCierre) });
    detalles.push({ etiqueta: 'Motivo del cierre', valor: fondo.motivoDeCierre ?? '—', largo: true });
  }
  if (fondo.observaciones) detalles.push({ etiqueta: 'Observaciones', valor: fondo.observaciones, largo: true });
  return detalles;
}

export function textoDelEstado(fondo: Pick<Fondo, 'estado' | 'aperturaAnulada'>): string {
  if (fondo.aperturaAnulada) return 'Apertura anulada';
  return fondo.estado === 'abierto' ? 'Abierto' : 'Cerrado';
}
