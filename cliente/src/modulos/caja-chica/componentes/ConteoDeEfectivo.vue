<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { unidadesDe } from '../composables/arqueos/edicion-de-arqueo';
import { centavosDe, textoDeCentavos } from '../composables/dinero';

/** El conteo del efectivo: una casilla por billete o moneda, con lo que suma cada una. */
defineProps<{ denominaciones: readonly string[]; error?: string }>();
const cantidades = defineModel<Record<string, string | number | null>>({ required: true });

const subtotal = (denominacion: string, cantidad: string | number | null | undefined): string =>
  textoDeCentavos((centavosDe(denominacion) ?? 0) * (unidadesDe(cantidad) ?? 0));
</script>

<template>
  <section aria-labelledby="titulo-del-conteo" class="space-y-3">
    <h2 id="titulo-del-conteo" class="text-lg font-semibold">Conteo del efectivo</h2>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      Escriba cuántos billetes o monedas hay de cada valor. Lo que deje vacío cuenta como cero.
    </p>
    <p v-if="error" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <CampoTexto
        v-for="denominacion in denominaciones"
        :key="denominacion"
        v-model="cantidades[denominacion]"
        :etiqueta="formatearMonto(denominacion)"
        tipo="number"
        :ayuda="`Suman ${formatearMonto(subtotal(denominacion, cantidades[denominacion]))}`"
      />
    </div>
  </section>
</template>
