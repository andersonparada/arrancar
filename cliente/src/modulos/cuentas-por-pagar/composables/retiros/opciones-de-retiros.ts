import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { RetiroResumen } from '../../servicios/tipos-de-retiros';

/** Los retiros que se pueden escoger para pagar: del más reciente al más viejo, con su custodio y lo que les queda. */
export function opcionesParaElegirRetiro(retiros: readonly RetiroResumen[]): OpcionBuscable<string>[] {
  return [...retiros]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero))
    .map((retiro) => ({
      valor: retiro.id,
      texto: `Retiro ${retiro.numero} · ${retiro.custodio} · ${formatearFecha(retiro.fecha)} · le quedan ${formatearMonto(retiro.disponible)}`,
    }));
}
