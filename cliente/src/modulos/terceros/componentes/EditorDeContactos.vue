<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { motivoSinAvisosDePago } from '../composables/avisos-de-pago';
import { contactoVacio } from '../composables/datos-de-tercero';
import type { DatosContacto } from '../servicios/terceros.api';

/** Las personas de contacto que se registran junto con el cliente o proveedor. */
const contactos = defineModel<DatosContacto[]>({ required: true });
</script>

<template>
  <div class="space-y-3">
    <p v-if="contactos.length === 0" class="text-sm text-tierra-500">
      Por ejemplo, el encargado de compras de una empresa. Se pueden agregar después desde la ficha.
    </p>
    <div
      v-for="(contacto, indice) in contactos"
      :key="indice"
      class="grid grid-cols-1 gap-3 rounded-xl p-3 ring-1 ring-tierra-200 sm:grid-cols-[1fr_1fr_1fr_auto] dark:ring-tierra-700"
    >
      <CampoTexto v-model="contacto.nombre" etiqueta="Nombre" requerido />
      <CampoTexto v-model="contacto.cargo" etiqueta="Cargo" />
      <CampoTexto v-model="contacto.telefono" etiqueta="Teléfono" tipo="tel" />
      <CampoTexto v-model="contacto.correo" etiqueta="Correo" tipo="email" class="sm:col-span-2" />
      <div class="sm:col-span-2">
        <CampoInterruptor
          v-model="contacto.recibeAvisosDePago"
          etiqueta="Recibe avisos de pago"
          :deshabilitado="motivoSinAvisosDePago(contacto.correo) !== null"
        />
        <p v-if="motivoSinAvisosDePago(contacto.correo)" class="mt-1 text-xs text-tierra-500">
          {{ motivoSinAvisosDePago(contacto.correo) }}
        </p>
      </div>
      <BotonBase
        class="self-end sm:col-start-4 sm:row-start-1"
        variante="fantasma"
        :icono="Trash2"
        :aria-label="`Quitar a ${contacto.nombre || 'este contacto'}`"
        @click="contactos.splice(indice, 1)"
      />
    </div>
    <BotonBase variante="secundario" pequeno :icono="Plus" @click="contactos.push(contactoVacio())">
      Agregar contacto
    </BotonBase>
  </div>
</template>
