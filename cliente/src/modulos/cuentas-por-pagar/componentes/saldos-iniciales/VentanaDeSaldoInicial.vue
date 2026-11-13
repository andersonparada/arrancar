<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeSaldoInicial } from '../../composables/saldos-iniciales/edicion-de-saldo-inicial';
import type { ProveedorParaSaldo } from '../../servicios/tipos-de-saldos-iniciales';
import AvisoDeSaldosIniciales from './AvisoDeSaldosIniciales.vue';
import CamposDeSaldoInicial from './CamposDeSaldoInicial.vue';

defineProps<{ errores: Record<string, string>; enviando: boolean; proveedores: ProveedorParaSaldo[] }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });

const titulo = computed(() => (edicion.value.id ? 'Corregir saldo inicial' : 'Nuevo saldo inicial'));
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="titulo" ancha @cerrar="emit('cerrar')">
    <form id="form-saldo-inicial" class="space-y-4" @submit.prevent="emit('guardar')">
      <AvisoDeSaldosIniciales />
      <CamposDeSaldoInicial v-model="edicion" :errores="errores" :proveedores="proveedores" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-saldo-inicial" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
