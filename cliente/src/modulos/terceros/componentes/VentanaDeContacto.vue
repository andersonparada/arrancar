<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { conAvisosCoherentes, motivoSinAvisosDePago } from '../composables/avisos-de-pago';
import type { DatosContacto } from '../servicios/terceros.api';

const props = defineProps<{
  abierta: boolean;
  esNuevo: boolean;
  inicial: DatosContacto;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [datos: DatosContacto] }>();

const datos = ref<DatosContacto>({ ...props.inicial });
watch(
  () => props.abierta,
  (abierta) => abierta && (datos.value = { ...props.inicial }),
);
const motivoSinAvisos = computed(() => motivoSinAvisosDePago(datos.value.correo));
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="esNuevo ? 'Nuevo contacto' : 'Editar contacto'" @cerrar="emit('cerrar')">
    <form id="form-contacto" class="space-y-4" @submit.prevent="emit('guardar', conAvisosCoherentes(datos))">
      <CampoTexto v-model="datos.nombre" etiqueta="Nombre" requerido :error="errores.nombre" />
      <CampoTexto v-model="datos.cargo" etiqueta="Cargo" :error="errores.cargo" />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="datos.telefono" etiqueta="Teléfono" tipo="tel" :error="errores.telefono" />
        <CampoTexto v-model="datos.whatsapp" etiqueta="WhatsApp" tipo="tel" :error="errores.whatsapp" />
      </div>
      <CampoTexto v-model="datos.correo" etiqueta="Correo" tipo="email" :error="errores.correo" />
      <div>
        <CampoInterruptor
          v-model="datos.recibeAvisosDePago"
          etiqueta="Recibe avisos de pago"
          descripcion="Le llega un correo cuando la empresa le registra un pago al tercero."
          :deshabilitado="motivoSinAvisos !== null"
        />
        <p v-if="motivoSinAvisos" class="mt-1 text-xs text-tierra-500" role="status">{{ motivoSinAvisos }}</p>
      </div>
      <CampoTexto v-model="datos.notas" etiqueta="Notas" multilinea :error="errores.notas" />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-contacto" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
