<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  etiqueta: string;
  tipo?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'search' | 'date';
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  placeholder?: string;
  autocompletar?: string;
  multilinea?: boolean;
  /** Desactiva la mayúscula automática y el corrector del teclado (usuarios, códigos). */
  sinCorreccion?: boolean;
  soloLectura?: boolean;
  /** Para números: `any` acepta decimales; sin él, el navegador solo acepta enteros. */
  paso?: string;
  /** Tope de caracteres que deja escribir el navegador (el servidor lo valida igual). */
  longitudMaxima?: number;
}>();

const modelo = defineModel<string | number | null>();
const id = useId();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-tierra-700 dark:text-tierra-200">
      {{ etiqueta }}<span v-if="requerido" class="text-red-600" aria-hidden="true"> *</span>
    </label>
    <textarea
      v-if="multilinea"
      :id="id"
      v-model="modelo"
      rows="3"
      :placeholder="placeholder"
      :aria-invalid="!!error"
      :aria-describedby="error || ayuda ? `${id}-nota` : undefined"
      class="rounded-lg border-0 bg-white px-3 py-2.5 text-base ring-1 ring-tierra-200 placeholder:text-tierra-400 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700"
    />
    <input
      v-else
      :id="id"
      v-model="modelo"
      :type="tipo ?? 'text'"
      :step="paso"
      :required="requerido"
      :placeholder="placeholder"
      :autocomplete="autocompletar"
      :autocapitalize="sinCorreccion ? 'none' : undefined"
      :autocorrect="sinCorreccion ? 'off' : undefined"
      :spellcheck="sinCorreccion ? false : undefined"
      :readonly="soloLectura"
      :maxlength="longitudMaxima"
      :aria-invalid="!!error"
      :aria-describedby="error || ayuda ? `${id}-nota` : undefined"
      class="rounded-lg border-0 bg-white px-3 py-2.5 text-base ring-1 ring-tierra-200 placeholder:text-tierra-400 read-only:bg-tierra-100 read-only:text-tierra-600 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700 dark:read-only:bg-tierra-900"
    />
    <p v-if="error" :id="`${id}-nota`" class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
    <p v-else-if="ayuda" :id="`${id}-nota`" class="text-xs text-tierra-500">{{ ayuda }}</p>
  </div>
</template>
