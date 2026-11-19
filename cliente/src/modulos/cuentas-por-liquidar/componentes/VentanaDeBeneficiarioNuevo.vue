<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeBeneficiarioNuevo } from '../composables/anticipos/opciones-del-beneficiario';

/**
 * Registrar al beneficiario sin salir del anticipo. Solo pide el nombre; el NIT y los demás datos se completan después en
 * Terceros.
 */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeBeneficiarioNuevo & { abierta: boolean }>({ required: true });
const TIPOS = [
  { valor: 'individual', texto: 'Persona individual' },
  { valor: 'juridica', texto: 'Persona jurídica (empresa)' },
] as const;
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Registrar al beneficiario" encima @cerrar="emit('cerrar')">
    <form id="form-beneficiario-nuevo" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <CampoSelector v-model="edicion.tipo" etiqueta="Tipo" :opciones="[...TIPOS]" />
      <template v-if="edicion.tipo === 'individual'">
        <CampoTexto v-model="edicion.nombres" etiqueta="Nombres" requerido :error="errores.nombres" />
        <CampoTexto v-model="edicion.apellidos" etiqueta="Apellidos" :error="errores.apellidos" />
      </template>
      <CampoTexto v-else v-model="edicion.razonSocial" etiqueta="Razón social" requerido :error="errores.razonSocial" />
      <p class="text-sm text-tierra-500">
        Si el anticipo va a justificarse con facturas a su nombre, complete después su NIT en Terceros.
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-beneficiario-nuevo" :cargando="enviando">Registrar</BotonBase>
    </template>
  </VentanaModal>
</template>
