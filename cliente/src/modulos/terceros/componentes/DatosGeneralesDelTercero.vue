<script setup lang="ts">
import { computed } from 'vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { FichaTercero } from '../servicios/terceros.api';

const props = defineProps<{ ficha: FichaTercero }>();

const SIN_REGISTRAR = 'Sin registrar';

const datos = computed(() => [
  { etiqueta: 'NIT', valor: props.ficha.nit },
  { etiqueta: 'DPI', valor: props.ficha.dpi },
  { etiqueta: 'Teléfono', valor: formatearTelefono(props.ficha.telefono) },
  { etiqueta: 'WhatsApp', valor: formatearTelefono(props.ficha.whatsapp) },
  { etiqueta: 'Correo', valor: props.ficha.correo },
  { etiqueta: 'Dirección', valor: props.ficha.direccion },
]);
</script>

<template>
  <TarjetaBase>
    <h2 class="mb-3 font-semibold">Datos generales</h2>
    <dl class="grid gap-3 text-sm sm:grid-cols-2">
      <div v-for="dato in datos" :key="dato.etiqueta">
        <dt class="text-tierra-500">{{ dato.etiqueta }}</dt>
        <dd>{{ dato.valor || SIN_REGISTRAR }}</dd>
      </div>
    </dl>
    <p v-if="ficha.notas" class="mt-3 text-sm text-tierra-600 dark:text-tierra-300">{{ ficha.notas }}</p>
  </TarjetaBase>
</template>
