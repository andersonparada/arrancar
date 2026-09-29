import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FilaDelReporte } from '../../servicios/movimientos.api';

type FilaParaReclasificar = Pick<FilaDelReporte, 'tipo' | 'puedeReclasificar' | 'anuladoEn'>;

/** El permiso que pide cambiar el concepto de la fila: los cheques tienen el suyo y las notas usan el de editar. */
export const permisoParaReclasificar = (fila: Pick<FilaDelReporte, 'tipo'>): string =>
  fila.tipo === 'cheque' ? 'bancos.cheques.reclasificar' : 'bancos.notas.editar';

/**
 * Si se ofrece «Reclasificar» en la fila: el servidor dice que se puede (`puedeReclasificar`: no un movimiento con
 * origen de otro módulo, ni un inverso, ni una transferencia, ni el saldo inicial), no está anulado y el usuario
 * tiene el permiso que corresponde. El cliente no adivina nada más.
 */
export const sePuedeReclasificar = (fila: FilaParaReclasificar, puede: (permiso: string) => boolean): boolean =>
  fila.puedeReclasificar && !fila.anuladoEn && puede(permisoParaReclasificar(fila));

/** Las opciones sin el concepto que la fila ya tiene (elegirlo no cambiaría nada). */
export const sinElConceptoActual = (
  opciones: readonly OpcionDeRegistro[],
  conceptoActual: string,
): OpcionDeRegistro[] => opciones.filter((opcion) => opcion.valor !== conceptoActual);

/** Lo que dice la ventana antes de confirmar: qué cambia, qué no y dónde queda. */
export const textoDeReclasificacion = (conceptoActual: string, conceptoNuevo: string | null): string =>
  conceptoNuevo
    ? `El concepto pasará de «${conceptoActual}» a «${conceptoNuevo}». Solo cambia el concepto, aunque el mes esté conciliado; el saldo no se mueve y el cambio queda en la auditoría.`
    : `Elija el nuevo concepto. Hoy es «${conceptoActual}». Solo cambia el concepto; el saldo no se mueve y el cambio queda en la auditoría.`;
