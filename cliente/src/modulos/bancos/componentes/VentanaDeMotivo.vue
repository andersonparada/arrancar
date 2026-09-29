<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';

/**
 * Ventana para dar de baja un registro (anular, eliminar, blanquear): explica qué pasará y pide el motivo,
 * obligatorio. Con `conFecha` también pide la fecha del movimiento inverso, que es lo que crea anular.
 */
withDefaults(
  defineProps<{
    abierta: boolean;
    titulo: string;
    texto: string;
    /** Lo que dice el botón de confirmar: «Anular», «Eliminar», «Blanquear». */
    accion?: string;
    conFecha?: boolean;
    errores: Record<string, string>;
    enviando: boolean;
  }>(),
  { accion: 'Anular' },
);
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
const motivo = defineModel<string>('motivo', { required: true });
const fecha = defineModel<string>('fecha', { default: '' });

const AYUDA_DE_LA_FECHA =
  'Fecha del movimiento inverso: no puede ser anterior a la original ni caer en un mes conciliado. Si la empresa usa la fecha del original y su mes sigue abierto, se usará esa.';
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="titulo" @cerrar="emit('cerrar')">
    <form id="form-de-motivo" class="space-y-4" @submit.prevent="emit('confirmar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ texto }}</p>
      <CampoTexto
        v-if="conFecha"
        v-model="fecha"
        etiqueta="Fecha"
        tipo="date"
        requerido
        :ayuda="AYUDA_DE_LA_FECHA"
        :error="errores.fecha"
      />
      <CampoTexto v-model="motivo" etiqueta="Motivo" multilinea requerido :error="errores.motivo" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-motivo" variante="peligro" :cargando="enviando">{{ accion }}</BotonBase>
    </template>
  </VentanaModal>
</template>
