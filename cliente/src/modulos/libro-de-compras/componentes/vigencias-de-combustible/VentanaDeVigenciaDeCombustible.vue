<script setup lang="ts">
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeVigenciaDeCombustible } from '../../composables/vigencias-de-combustible/edicion-de-vigencia-de-combustible';
import CamposDeVigenciaDeCombustible from './CamposDeVigenciaDeCombustible.vue';

defineProps<{
  errores: Record<string, string>;
  enviando: boolean;
  referencias: Record<'combustibleId', OpcionDeRegistro[]>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeVigenciaDeCombustible>({ required: true });
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="edicion.id ? 'Editar vigencia de combustible' : 'Nueva vigencia de combustible'"
    @cerrar="emit('cerrar')"
  >
    <form id="form-vigencia-de-combustible" @submit.prevent="emit('guardar')">
      <CamposDeVigenciaDeCombustible v-model="edicion" :errores="errores" :referencias="referencias" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-vigencia-de-combustible" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
