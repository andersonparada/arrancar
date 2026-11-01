import { onMounted, ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiDteRecibidos } from '../../servicios/dte-recibidos.api';

/**
 * Cuántos DTE de la SAT esperan registro, para avisarlo en «Ingreso de facturas». Quien no puede ver la bandeja, o
 * nunca importó nada, ve 0 y no se le muestra aviso alguno; un fallo al contar tampoco molesta.
 */
export function usarPendientesDeLaSat() {
  const pendientes = ref(0);

  onMounted(async () => {
    if (!usarSesion().puede('libro-de-compras.documentos.importar')) return;
    const pagina = await apiDteRecibidos.listar({ estado: 'pendiente', limite: 1 }).catch(() => null);
    pendientes.value = pagina?.total ?? 0;
  });

  return pendientes;
}
