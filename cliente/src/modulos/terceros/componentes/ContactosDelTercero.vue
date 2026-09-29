<script setup lang="ts">
import { Pencil, Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { Contacto } from '../servicios/terceros.api';

defineProps<{ contactos: Contacto[]; puedeAgregar: boolean; puedeEditar: boolean; puedeEliminar: boolean }>();
defineEmits<{ agregar: []; editar: [contacto: Contacto]; eliminar: [contacto: Contacto] }>();

const comoLlegarle = (contacto: Contacto) =>
  [formatearTelefono(contacto.telefono), contacto.correo].filter(Boolean).join(' · ') || 'Sin datos de contacto';
</script>

<template>
  <TarjetaBase>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold">Contactos</h2>
      <BotonBase v-if="puedeAgregar" variante="secundario" pequeno :icono="Plus" @click="$emit('agregar')">
        Agregar
      </BotonBase>
    </div>
    <p v-if="contactos.length === 0" class="text-sm text-tierra-500">Sin contactos registrados.</p>
    <ul v-else class="divide-y divide-tierra-100 dark:divide-tierra-800">
      <li v-for="contacto in contactos" :key="contacto.id" class="flex items-center justify-between gap-3 py-2">
        <div class="min-w-0">
          <p class="truncate font-medium">
            {{ contacto.nombre }}<span v-if="contacto.cargo" class="text-tierra-500"> · {{ contacto.cargo }}</span>
          </p>
          <p class="truncate text-sm text-tierra-500">{{ comoLlegarle(contacto) }}</p>
        </div>
        <div class="flex shrink-0 gap-1">
          <BotonBase
            v-if="puedeEditar"
            variante="fantasma"
            pequeno
            :icono="Pencil"
            :aria-label="`Editar a ${contacto.nombre}`"
            @click="$emit('editar', contacto)"
          />
          <BotonBase
            v-if="puedeEliminar"
            variante="fantasma"
            pequeno
            :icono="Trash2"
            :aria-label="`Eliminar a ${contacto.nombre}`"
            @click="$emit('eliminar', contacto)"
          />
        </div>
      </li>
    </ul>
  </TarjetaBase>
</template>
