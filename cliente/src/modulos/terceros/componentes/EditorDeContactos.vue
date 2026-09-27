<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
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
      class="grid gap-3 rounded-xl p-3 ring-1 ring-tierra-200 sm:grid-cols-[1fr_1fr_1fr_auto] dark:ring-tierra-700"
    >
      <CampoTexto v-model="contacto.nombre" etiqueta="Nombre" requerido />
      <CampoTexto v-model="contacto.cargo" etiqueta="Cargo" />
      <CampoTexto v-model="contacto.telefono" etiqueta="Teléfono" tipo="tel" />
      <BotonBase
        class="self-end"
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
