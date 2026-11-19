import type { MesDeConciliacion } from '../../servicios/movimientos.api';

/** `mm/aaaa`, o `null` si no hay mes. */
export const textoDeMes = (mes: MesDeConciliacion | null): string | null =>
  mes ? `${String(mes.mes).padStart(2, '0')}/${mes.anio}` : null;

/** «Conciliado en mm/aaaa», o «Sin conciliar» si la fila aún no entra en una conciliación autorizada. */
export const textoDeConciliado = (mes: MesDeConciliacion | null): string =>
  mes ? `Conciliado en ${textoDeMes(mes)}` : 'Sin conciliar';
