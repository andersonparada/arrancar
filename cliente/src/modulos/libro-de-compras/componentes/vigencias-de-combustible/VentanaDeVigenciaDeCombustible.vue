<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeVigenciaDeCombustible } from '../../composables/vigencias-de-combustible/edicion-de-vigencia-de-combustible';
import CamposDeVigenciaDeCombustible from './CamposDeVigenciaDeCombustible.vue';

/** Registrar o corregir una tasa del combustible; se abre encima de su historia de tasas. */
defineProps<{ combustible: string; errores: Record<string, string>; enviando: boolean; aviso: string | null }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeVigenciaDeCombustible>({ required: true });
</script>

<template>
  <VentanaModal
    encima
    :abierta="edicion.abierta"
    :titulo="`${edicion.id ? 'Corregir tasa' : 'Tasa nueva'} · ${combustible}`"
    @cerrar="emit('cerrar')"
  >
    <form id="form-vigencia-de-combustible" @submit.prevent="emit('guardar')">
      <CamposDeVigenciaDeCombustible v-model="edicion" :errores="errores" :aviso="aviso" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-vigencia-de-combustible" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
