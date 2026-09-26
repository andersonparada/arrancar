<script setup lang="ts">
import { ref, useId, watch } from 'vue';

defineProps<{ etiqueta: string; ayuda?: string }>();
const modelo = defineModel<string>({ required: true });
const id = useId();
const texto = ref(modelo.value);

watch(modelo, (valor) => (texto.value = valor));

/** Solo actualiza el color cuando el texto es un hexadecimal completo. */
function alEscribir(valor: string): void {
  texto.value = valor;
  const normalizado = valor.startsWith('#') ? valor : `#${valor}`;
  if (/^#[0-9a-fA-F]{6}$/.test(normalizado)) modelo.value = normalizado.toLowerCase();
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-tierra-700 dark:text-tierra-200">{{ etiqueta }}</label>
    <div class="flex items-center gap-2">
      <input
        v-model="modelo"
        type="color"
        :aria-label="`${etiqueta}: selector`"
        class="h-11 w-14 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0 ring-1 ring-tierra-200 dark:ring-tierra-700"
      />
      <input
        :id="id"
        :value="texto"
        maxlength="7"
        spellcheck="false"
        class="w-full rounded-lg border-0 bg-white px-3 py-2.5 font-mono text-base uppercase ring-1 ring-tierra-200 focus:ring-2 focus:ring-campo-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700"
        @input="alEscribir(($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="ayuda" class="text-xs text-tierra-500">{{ ayuda }}</p>
  </div>
</template>
