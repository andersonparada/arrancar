<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { AVISO_DE_REIMPRESION } from '../composables/contrasenas/ficha-de-contrasena';
import type { MarcasParaAgregar } from '../composables/contrasenas/usar-acciones-de-contrasena';
import type { DocumentosDisponibles } from '../servicios/tipos-de-contrasenas';
import SeleccionDeDocumentosDeContrasena from './SeleccionDeDocumentosDeContrasena.vue';

/** Meter más documentos del mismo proveedor en una contraseña vigente; las notas que marque se restan de las facturas. */
defineProps<{
  disponibles: DocumentosDisponibles;
  cargando: boolean;
  impresa: boolean;
  error?: string;
  enviando: boolean;
}>();
const emit = defineEmits<{
  cerrar: [];
  agregar: [];
  alternarCargo: [id: string];
  alternarNota: [id: string];
  marcarCargos: [marcar: boolean];
  marcarNotas: [marcar: boolean];
}>();
const edicion = defineModel<MarcasParaAgregar>({ required: true });
const cuantos = computed(() => edicion.value.cargos.length + edicion.value.notas.length);
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Agregar documentos" ancha @cerrar="emit('cerrar')">
    <form id="form-agregar-documentos" class="space-y-4" @submit.prevent="emit('agregar')">
      <p
        v-if="impresa"
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="note"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AVISO_DE_REIMPRESION }}</span>
      </p>
      <SeleccionDeDocumentosDeContrasena
        :disponibles="disponibles"
        :cargando="cargando"
        hay-proveedor
        :cargos-marcados="edicion.cargos"
        :notas-marcadas="edicion.notas"
        :error="error"
        @alternar-cargo="emit('alternarCargo', $event)"
        @alternar-nota="emit('alternarNota', $event)"
        @marcar-cargos="emit('marcarCargos', $event)"
        @marcar-notas="emit('marcarNotas', $event)"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-agregar-documentos" :cargando="enviando">
        {{ cuantos > 0 ? `Agregar (${cuantos})` : 'Agregar' }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
