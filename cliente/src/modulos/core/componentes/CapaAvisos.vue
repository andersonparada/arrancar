<script setup lang="ts">
import { CircleCheck, CircleAlert, Info, X } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import BotonBase from './BotonBase.vue';
import VentanaModal from './VentanaModal.vue';

const avisos = usarAvisos();
const iconos = { exito: CircleCheck, error: CircleAlert, info: Info };
const colores = {
  exito: 'bg-campo-800 text-white',
  error: 'bg-red-700 text-white',
  info: 'bg-tierra-800 text-white',
};
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="-translate-y-4 opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition"
      leave-active-class="transition"
    >
      <div
        v-for="aviso in avisos.avisos"
        :key="aviso.id"
        class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg"
        :class="colores[aviso.tipo]"
        :role="aviso.tipo === 'error' ? 'alert' : 'status'"
      >
        <component :is="iconos[aviso.tipo]" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p class="flex-1">{{ aviso.mensaje }}</p>
        <button
          type="button"
          class="opacity-80 hover:opacity-100"
          aria-label="Cerrar aviso"
          @click="avisos.cerrar(aviso.id)"
        >
          <X class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>

  <VentanaModal
    :abierta="avisos.confirmacion !== null"
    :titulo="avisos.confirmacion?.titulo ?? ''"
    encima
    @cerrar="avisos.responderConfirmacion(false)"
  >
    <p class="text-sm text-tierra-700 dark:text-tierra-200">{{ avisos.confirmacion?.mensaje }}</p>
    <template #pie>
      <BotonBase variante="secundario" @click="avisos.responderConfirmacion(false)">Cancelar</BotonBase>
      <BotonBase
        :variante="avisos.confirmacion?.peligroso ? 'peligro' : 'primario'"
        @click="avisos.responderConfirmacion(true)"
      >
        {{ avisos.confirmacion?.textoConfirmar }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
