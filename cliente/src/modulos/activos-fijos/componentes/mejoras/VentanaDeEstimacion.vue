<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeEstimacion } from '../../composables/mejoras/edicion-de-revision';

/** Revisar la estimación contable: los meses que le quedan y, si cambia, el valor residual. Rige hacia adelante. */
defineProps<{
  abierta: boolean;
  errores: Record<string, string>;
  enviando: boolean;
  vidaTotal: number | null;
  residual: string | null;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeEstimacion>({ required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Revisar estimación" @cerrar="emit('cerrar')">
    <form id="form-de-estimacion" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Cambia la vida útil o el residual contable del activo desde el primer mes abierto; los meses cerrados no se
        tocan. El porcentaje fiscal no se revisa: lo fija la ley.
        <template v-if="vidaTotal !== null">
          Hoy tiene una vida total de {{ vidaTotal }} meses<template v-if="residual !== null">
            y un residual de {{ formatearMonto(residual) }}</template
          >.
        </template>
      </p>
      <CampoTexto
        v-model="edicion.vidaUtilRestante"
        etiqueta="Meses que le quedan de vida"
        tipo="number"
        paso="1"
        requerido
        :error="errores.vidaUtilRestanteMeses"
      />
      <CampoTexto
        v-model="edicion.valorResidual"
        etiqueta="Valor residual"
        tipo="number"
        paso="0.01"
        ayuda="Déjelo como está si no cambia."
        :error="errores.valorResidual"
      />
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        multilinea
        requerido
        :longitud-maxima="300"
        contar
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-estimacion" :cargando="enviando">Revisar estimación</BotonBase>
    </template>
  </VentanaModal>
</template>
