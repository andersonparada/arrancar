import { ref } from 'vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';

/**
 * La fecha de corte de la carga inicial, ya formateada, para explicar la anulación de una partida de la carga
 * inicial. Se pide una sola vez y solo cuando hace falta; si el usuario no puede ver los saldos iniciales o aún no
 * hay fecha, queda en `null` y el texto nombra el corte sin la fecha (el servidor valida igual).
 */
export function usarCorteDeApertura() {
  const corte = ref<string | null>(null);
  const sesion = usarSesion();
  let pedido = false;

  async function cargar(): Promise<void> {
    if (pedido || !sesion.puede('bancos.saldos-iniciales.ver')) return;
    pedido = true;
    try {
      const { fechaDeCorte } = await apiSaldosIniciales.listar();
      corte.value = fechaDeCorte ? formatearFecha(fechaDeCorte) : null;
    } catch {
      pedido = false;
    }
  }

  return { corte, cargar };
}
