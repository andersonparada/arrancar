<script setup lang="ts">
import { computed } from 'vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDeCondiciones } from '../composables/condiciones-de-pago';
import { usarFichaDeCondiciones } from '../composables/usar-condiciones-de-pago';

/** El plazo de pago del proveedor y lo que se le debe con la empresa activa, solo lectura. */
const props = defineProps<{ registroId: string }>();
const { datos, cargando } = usarFichaDeCondiciones(() => props.registroId);
const detalles = computed(() => (datos.value ? detallesDeCondiciones(datos.value.condiciones, datos.value.saldo) : []));
</script>

<template>
  <p v-if="cargando && !datos" class="text-sm text-tierra-500" role="status">Cargando condiciones de pago…</p>
  <DatosDelRegistro v-else-if="datos" :detalles="detalles" />
</template>
