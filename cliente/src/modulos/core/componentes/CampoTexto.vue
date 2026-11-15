<script setup lang="ts">
import { computed, useId } from 'vue';
import { contadorDeCaracteres } from '../utilidades/contador-de-caracteres';
import { usarErrorDescartable } from '../composables/usar-formulario';
import { mensajeDeValidacionNativa } from '../utilidades/validacion-nativa';

const props = defineProps<{
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
  /** Para fechas: la última que deja elegir el navegador (`AAAA-MM-DD`). */
  maximo?: string;
  /** Tope de caracteres que deja escribir el navegador (el servidor lo valida igual). */
  longitudMaxima?: number;
  /** Con `contar`, el tope no corta lo escrito: se muestra «n de N caracteres» y el error si se pasa. */
  contar?: boolean;
}>();

const modelo = defineModel<string | number | null>();
const id = useId();
const contador = computed(() =>
  props.contar && props.longitudMaxima ? contadorDeCaracteres(modelo.value, props.longitudMaxima) : null,
);
const errorDelServidor = usarErrorDescartable(
  () => props.error,
  () => modelo.value,
);
const errorVisible = computed(() => errorDelServidor.value ?? contador.value?.error ?? undefined);

/** Cambia el texto de la burbuja del navegador (sale en su idioma) por uno en español; se limpia al escribir. */
function alInvalidar(evento: Event): void {
  const campo = evento.target as HTMLInputElement;
  campo.setCustomValidity(
    mensajeDeValidacionNativa({ validez: campo.validity, tipo: props.tipo, maximo: props.maximo }),
  );
}
const alEscribir = (evento: Event): void => (evento.target as HTMLInputElement).setCustomValidity('');
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
      :aria-invalid="!!errorVisible"
      :aria-describedby="errorVisible || ayuda ? `${id}-nota` : undefined"
      class="rounded-lg border-0 bg-white px-3 py-2.5 text-base ring-1 ring-tierra-200 placeholder:text-tierra-400 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700"
    />
    <input
      v-else
      :id="id"
      v-model="modelo"
      :type="tipo ?? 'text'"
      :step="paso"
      :max="maximo"
      :required="requerido"
      :placeholder="placeholder"
      :autocomplete="autocompletar"
      :autocapitalize="sinCorreccion ? 'none' : undefined"
      :autocorrect="sinCorreccion ? 'off' : undefined"
      :spellcheck="sinCorreccion ? false : undefined"
      :readonly="soloLectura"
      :maxlength="contar ? undefined : longitudMaxima"
      :aria-invalid="!!errorVisible"
      :aria-describedby="errorVisible || ayuda ? `${id}-nota` : undefined"
      class="rounded-lg border-0 bg-white px-3 py-2.5 text-base ring-1 ring-tierra-200 placeholder:text-tierra-400 read-only:bg-tierra-100 read-only:text-tierra-600 focus:ring-2 focus:ring-campo-500 aria-invalid:ring-red-500 sm:text-sm dark:bg-tierra-800 dark:ring-tierra-700 dark:read-only:bg-tierra-900"
      @invalid="alInvalidar"
      @input="alEscribir"
    />
    <p v-if="errorVisible" :id="`${id}-nota`" class="text-sm text-red-700 dark:text-red-400">{{ errorVisible }}</p>
    <p v-else-if="ayuda" :id="`${id}-nota`" class="text-xs text-tierra-500">{{ ayuda }}</p>
    <p
      v-if="contador"
      class="text-right text-xs tabular-nums"
      :class="contador.excedido ? 'font-medium text-red-700 dark:text-red-400' : 'text-tierra-500'"
      aria-live="polite"
    >
      {{ contador.texto }}
    </p>
  </div>
</template>
