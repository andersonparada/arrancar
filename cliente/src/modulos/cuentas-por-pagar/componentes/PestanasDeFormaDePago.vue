<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { ETIQUETAS_DE_FORMA } from '../composables/pagos/opciones-del-pago';
import type { FormaDePagoNuevo } from '../servicios/tipos-de-pagos';

/** Las formas de pago que el usuario puede usar, como pestañas con flechas del teclado (Inicio y Fin incluidos). */
const props = defineProps<{ formas: FormaDePagoNuevo[] }>();
const forma = defineModel<FormaDePagoNuevo>({ required: true });
const botones = ref<HTMLButtonElement[]>([]);

async function moverCon(evento: KeyboardEvent, indice: number): Promise<void> {
  const ultimo = props.formas.length - 1;
  const destinos: Record<string, number> = {
    ArrowRight: indice === ultimo ? 0 : indice + 1,
    ArrowLeft: indice === 0 ? ultimo : indice - 1,
    Home: 0,
    End: ultimo,
  };
  const destino = destinos[evento.key];
  if (destino === undefined) return;
  evento.preventDefault();
  forma.value = props.formas[destino]!;
  await nextTick();
  botones.value[destino]?.focus();
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Forma de pago"
    class="grid grid-cols-2 gap-1 rounded-xl bg-tierra-100 p-1 sm:inline-flex dark:bg-tierra-800"
  >
    <button
      v-for="(opcion, indice) in formas"
      :key="opcion"
      :ref="(elemento) => (botones[indice] = elemento as HTMLButtonElement)"
      type="button"
      role="tab"
      :aria-selected="forma === opcion"
      :tabindex="forma === opcion ? 0 : -1"
      class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      :class="
        forma === opcion
          ? 'bg-white text-tierra-900 shadow-sm dark:bg-tierra-600 dark:text-white'
          : 'text-tierra-700 hover:bg-white/60 dark:text-tierra-200 dark:hover:bg-tierra-700'
      "
      @click="forma = opcion"
      @keydown="moverCon($event, indice)"
    >
      {{ ETIQUETAS_DE_FORMA[opcion] }}
    </button>
  </div>
</template>
