import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { SaldoInicial, TotalesDeSaldos } from '../../servicios/saldos-iniciales.api';

/** Lo que muestra la tarjeta del saldo en la lista. */
export const detallesDeTarjetaDeSaldo = (saldo: SaldoInicial): DetalleDeRegistro[] => [
  { etiqueta: 'Clase', valor: saldo.claseNombre },
  { etiqueta: 'Costo', valor: formatearMonto(saldo.costo) },
  { etiqueta: 'Depreciación acumulada', valor: formatearMonto(saldo.depreciacionAcumuladaContable) },
  { etiqueta: 'Valor en libros', valor: formatearMonto(saldo.valorEnLibros) },
  { etiqueta: 'Localidad', valor: formatearTexto(saldo.localidadNombre) },
];

/** El saldo inicial de un activo en su ficha: lo que se cargó al corte, contable y fiscal. */
export function detallesDeSaldoEnFicha(saldo: SaldoInicial): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Fecha de corte', valor: formatearFecha(saldo.fechaDeCorte) },
    { etiqueta: 'Costo al corte', valor: formatearMonto(saldo.costo) },
    { etiqueta: 'Depreciación acumulada contable', valor: formatearMonto(saldo.depreciacionAcumuladaContable) },
    { etiqueta: 'Valor en libros al corte', valor: formatearMonto(saldo.valorEnLibros) },
    { etiqueta: 'Costo fiscal', valor: formatearMonto(saldo.costoFiscal) },
    { etiqueta: 'Base fiscal', valor: formatearMonto(saldo.baseFiscal) },
    { etiqueta: 'Depreciación acumulada fiscal', valor: formatearMonto(saldo.depreciacionAcumuladaFiscal) },
    {
      etiqueta: 'Vida útil restante',
      valor: saldo.vidaUtilRestanteMeses === null ? '—' : `${saldo.vidaUtilRestanteMeses} meses`,
    },
  ];
}

/** Las cifras del cuadre que se comparan con el balance, con formato. */
export function cifrasDelCuadre(totales: TotalesDeSaldos): { etiqueta: string; valor: string }[] {
  return [
    { etiqueta: 'Costo', valor: formatearMonto(totales.costo) },
    { etiqueta: 'Depreciación acumulada contable', valor: formatearMonto(totales.depreciacionAcumuladaContable) },
    { etiqueta: 'Valor en libros', valor: formatearMonto(totales.valorEnLibros) },
    { etiqueta: 'Costo fiscal', valor: formatearMonto(totales.costoFiscal) },
    { etiqueta: 'Depreciación acumulada fiscal', valor: formatearMonto(totales.depreciacionAcumuladaFiscal) },
  ];
}

/** Por qué la lista no deja cargar saldos todavía (o `null` si se puede), con cómo resolverlo. */
export function motivoDeCargaBloqueada(
  carga: { fechaDeInicio: string | null; cargaCerrada: boolean },
  haySaldos: boolean,
): string | null {
  if (carga.cargaCerrada)
    return 'La carga inicial de la empresa ya está cerrada. Para cambiar saldos, reábrala desde la carga inicial.';
  if (carga.fechaDeInicio === null && !haySaldos)
    return 'Antes de cargar saldos, fije la fecha de inicio de la empresa en la carga inicial: los saldos son los de esa fecha.';
  return null;
}
