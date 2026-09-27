<script setup lang="ts">
import { computed } from 'vue';
import { modulosContratables, requisitosDe, type FormularioDeAlta } from '../../composables/plataforma/alta-de-cuenta';
import type { EstadoModulo } from '../../servicios/plataforma.api';
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import VentanaModal from '../VentanaModal.vue';
import CamposDelPropietario from './CamposDelPropietario.vue';

const props = defineProps<{ catalogo: EstadoModulo[]; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const alta = defineModel<FormularioDeAlta>({ required: true });
const contratables = computed(() => modulosContratables(props.catalogo));
</script>

<template>
  <VentanaModal :abierta="alta.abierta" titulo="Nueva cuenta" ancha @cerrar="emit('cerrar')">
    <form id="form-alta" class="space-y-5" @submit.prevent="emit('guardar')">
      <CampoTexto
        v-model="alta.nombreCuenta"
        etiqueta="Nombre de la cuenta"
        placeholder="Ej. Familia Pérez"
        requerido
        :error="errores.nombreCuenta"
      />
      <fieldset class="grid gap-4 sm:grid-cols-2">
        <legend class="mb-2 text-sm font-semibold">Primera empresa</legend>
        <CampoTexto v-model="alta.empresa" etiqueta="Nombre" requerido :error="errores['empresa.nombre']" />
        <CampoTexto v-model="alta.nit" etiqueta="NIT" :error="errores['empresa.nit']" />
      </fieldset>
      <CamposDelPropietario v-model="alta" :errores="errores" />
      <fieldset v-if="contratables.length">
        <legend class="mb-2 text-sm font-semibold">Módulos contratados</legend>
        <label v-for="modulo in contratables" :key="modulo.clave" class="flex items-start gap-2.5 py-1.5">
          <input v-model="alta.modulos" type="checkbox" :value="modulo.clave" class="mt-0.5 size-4 accent-campo-700" />
          <span class="text-sm">
            {{ modulo.nombre }}
            <span class="block text-xs text-tierra-500">{{ requisitosDe(modulo, catalogo) }}</span>
          </span>
        </label>
      </fieldset>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-alta" :cargando="enviando">Crear cuenta</BotonBase>
    </template>
  </VentanaModal>
</template>
