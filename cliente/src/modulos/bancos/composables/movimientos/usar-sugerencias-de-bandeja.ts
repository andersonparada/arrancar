import { computed, ref, watch } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSugerencias, type RespuestaDeSugerencias } from '../../servicios/sugerencias.api';
import { indexarSugerencias } from '../sugerencias/lote-de-sugerencias';
import { filtroDeLaConsulta, type FiltrosDeMovimientos } from './filtros-de-movimientos';

const SIN_SUGERENCIAS: RespuestaDeSugerencias = {
  confianzaMinima: 60,
  vidaMediaDias: 180,
  truncado: false,
  sugerencias: [],
};

/**
 * Lo que el servidor propone para cada pendiente del filtro (cuenta y fechas). Solo lo pide quien puede clasificar
 * (`bancos.notas.editar`); sin ese permiso la bandeja no muestra propuestas. Recarga al cambiar el filtro y cuando
 * la pantalla llama a `cargar` (lo recién clasificado ya enseña a sus vecinos).
 */
export function usarSugerenciasDeBandeja(filtros: FiltrosDeMovimientos) {
  const sesion = usarSesion();
  const { datos, cargando, cargar } = usarCarga(
    async () => {
      if (!sesion.puede('bancos.notas.editar')) return SIN_SUGERENCIAS;
      const { cuentaBancariaId, desde, hasta } = filtroDeLaConsulta(filtros);
      return apiSugerencias.deLosPendientes({ cuentaBancariaId, desde, hasta });
    },
    SIN_SUGERENCIAS,
    'No se pudieron calcular las sugerencias de concepto.',
  );
  watch(filtros, cargar);
  const soloConSugerencia = ref(false);
  const porMovimiento = computed(() => indexarSugerencias(datos.value));
  return {
    porMovimiento,
    truncado: computed(() => datos.value.truncado),
    calculando: cargando,
    soloConSugerencia,
    cargar,
  };
}
