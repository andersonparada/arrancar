import { ref, watch } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiSaldosIniciales, type SaldoInicial } from '../../servicios/saldos-iniciales.api';
import type { Activo } from '../../servicios/activos.api';

/**
 * El saldo inicial del activo para su ficha: solo se pide si el activo viene de un saldo inicial y el usuario puede
 * verlos. Si no se puede traer, la ficha sigue sin esa sección (el resto de los datos no depende de él).
 */
export function usarSaldoDeFicha(activo: () => Pick<Activo, 'id' | 'origen'> | null) {
  const sesion = usarSesion();
  const saldo = ref<SaldoInicial | null>(null);

  watch(
    () => activo()?.id,
    async () => {
      const actual = activo();
      saldo.value = null;
      if (actual?.origen !== 'saldo_inicial' || !sesion.puede('activos-fijos.saldos-iniciales.ver')) return;
      try {
        saldo.value = await apiSaldosIniciales.obtener(actual.id);
      } catch {
        saldo.value = null;
      }
    },
    { immediate: true },
  );

  return saldo;
}
