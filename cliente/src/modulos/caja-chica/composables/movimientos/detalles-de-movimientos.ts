import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearFechaHora, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ArqueoResumen } from '../../servicios/tipos-de-arqueos';
import type { FormaDeReposicion, ReposicionResumen } from '../../servicios/tipos-de-reposiciones';
import type { ValeResumen } from '../../servicios/tipos-de-vales';

export type TonoDeInsignia = 'campo' | 'trigo' | 'tierra' | 'rojo';

export interface MarcaDeMovimiento {
  texto: string;
  tono: TonoDeInsignia;
}

export const FORMAS_DE_REPOSICION: Record<FormaDeReposicion, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  compensada_al_cerrar: 'Compensada al cerrar el fondo',
};

export function detallesDeReposicion(reposicion: ReposicionResumen): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Fecha', valor: formatearFecha(reposicion.fecha) },
    { etiqueta: 'Monto', valor: formatearMonto(reposicion.monto) },
    { etiqueta: 'Forma', valor: FORMAS_DE_REPOSICION[reposicion.forma] },
    { etiqueta: 'Custodio', valor: reposicion.custodio },
  ];
}

export function marcaDeReposicion(reposicion: ReposicionResumen): MarcaDeMovimiento | null {
  return reposicion.estado === 'anulada' ? { texto: 'Anulada', tono: 'rojo' } : null;
}

/** Faltante o sobrante: la diferencia viaja con signo, negativa es faltante. */
export function marcaDeArqueo(arqueo: ArqueoResumen): MarcaDeMovimiento {
  if (arqueo.estado === 'anulado') return { texto: 'Anulado', tono: 'rojo' };
  const diferencia = Number(arqueo.diferencia);
  if (diferencia === 0) return { texto: 'Cuadró', tono: 'campo' };
  const monto = formatearMonto(Math.abs(diferencia).toFixed(2));
  return diferencia < 0 ? { texto: `Faltó ${monto}`, tono: 'rojo' } : { texto: `Sobró ${monto}`, tono: 'trigo' };
}

export function detallesDeArqueo(arqueo: ArqueoResumen): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Fecha', valor: formatearFechaHora(arqueo.realizadoEn) },
    { etiqueta: 'Contado', valor: formatearMonto(arqueo.efectivoContado) },
    { etiqueta: 'Esperado', valor: formatearMonto(arqueo.efectivoEsperado) },
    { etiqueta: 'Custodio', valor: arqueo.custodio },
  ];
}

const ESTADOS_DEL_VALE = { abierto: 'Abierto', liquidado: 'Liquidado', anulado: 'Anulado' };

export function marcaDeVale(vale: ValeResumen): MarcaDeMovimiento {
  if (vale.estado === 'anulado') return { texto: ESTADOS_DEL_VALE.anulado, tono: 'rojo' };
  if (vale.estado === 'liquidado') return { texto: ESTADOS_DEL_VALE.liquidado, tono: 'campo' };
  const dias = vale.diasAbierto === 1 ? '1 día' : `${vale.diasAbierto} días`;
  return { texto: `Abierto hace ${dias}`, tono: vale.avisos.length > 0 ? 'trigo' : 'tierra' };
}

export function detallesDeVale(vale: ValeResumen): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Fecha', valor: formatearFecha(vale.fecha) },
    { etiqueta: 'Monto', valor: formatearMonto(vale.monto) },
    { etiqueta: 'Entregado a', valor: vale.entregadoA },
  ];
  if (vale.estado === 'liquidado')
    detalles.push({ etiqueta: 'Regresó al fondo', valor: formatearMonto(vale.devuelto) });
  return detalles;
}
