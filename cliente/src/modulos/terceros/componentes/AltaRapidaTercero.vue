<script setup lang="ts">
import { reactive, watch } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { DatosMinimosDeTercero } from '../composables/usar-alta-de-tercero';

/**
 * Ventana para registrar a alguien sin salir de la pantalla (por ejemplo, al
 * registrar una venta). Solo pide el nombre; quien la usa guarda los datos con
 * `usarAltaDeTercero` y le pasa los errores y el estado de envío.
 */
const props = defineProps<{ abierta: boolean; enviando: boolean; errores: Record<string, string> }>();
const emit = defineEmits<{ cerrar: []; guardar: [datos: DatosMinimosDeTercero] }>();

const VACIO: DatosMinimosDeTercero = { tipo: 'individual', nombres: '', apellidos: '', razonSocial: '' };
const datos = reactive({ ...VACIO });

watch(
  () => props.abierta,
  (abierta) => abierta && Object.assign(datos, VACIO),
);
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Nuevo cliente o proveedor" @cerrar="emit('cerrar')">
    <form id="form-alta-rapida-tercero" class="space-y-4" @submit.prevent="emit('guardar', { ...datos })">
      <CampoSelector
        v-model="datos.tipo"
        etiqueta="Tipo"
        :opciones="[
          { valor: 'individual', texto: 'Persona individual' },
          { valor: 'juridica', texto: 'Persona jurídica (empresa)' },
        ]"
      />
      <template v-if="datos.tipo === 'individual'">
        <CampoTexto v-model="datos.nombres" etiqueta="Nombres" requerido :error="errores.nombres" />
        <CampoTexto v-model="datos.apellidos" etiqueta="Apellidos" :error="errores.apellidos" />
      </template>
      <CampoTexto v-else v-model="datos.razonSocial" etiqueta="Razón social" requerido :error="errores.razonSocial" />
      <p class="text-sm text-tierra-500">
        El NIT, el DPI, el teléfono y los papeles se completan después, desde la ficha.
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-alta-rapida-tercero" :cargando="enviando">Crear</BotonBase>
    </template>
  </VentanaModal>
</template>
