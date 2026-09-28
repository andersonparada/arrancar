<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeSaldoInicial } from '../../composables/cuentas-bancarias/edicion-de-saldo-inicial';
import CamposDeSaldoInicial from './CamposDeSaldoInicial.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });

const titulo = computed(() => (edicion.value.id ? 'Corregir saldo inicial' : 'Registrar saldo inicial'));
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-saldo-inicial" @submit.prevent="emit('guardar')">
      <CamposDeSaldoInicial v-model="edicion" :errores="errores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-saldo-inicial" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
