<script setup lang="ts">
import { Building2, Mail, MapPin, Pencil, Phone } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { Empresa } from '../servicios/empresas.api';

defineProps<{ empresa: Empresa; enUso: boolean }>();
const emit = defineEmits<{ editar: [] }>();
</script>

<template>
  <TarjetaBase class="flex h-full flex-col gap-3">
    <div class="flex items-start gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-campo-100 text-campo-800 dark:bg-campo-900 dark:text-campo-200"
      >
        <Building2 class="size-5" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold">{{ empresa.nombre }}</p>
        <p class="text-sm text-tierra-500">NIT {{ empresa.nit ?? 'sin registrar' }} · {{ empresa.monedaBase }}</p>
      </div>
      <InsigniaBase v-if="enUso" tono="campo">Activa ahora</InsigniaBase>
      <InsigniaBase v-else-if="!empresa.activa" tono="rojo">Desactivada</InsigniaBase>
    </div>
    <ul class="space-y-1 text-sm text-tierra-600 dark:text-tierra-300">
      <li v-if="empresa.direccion" class="flex items-center gap-2">
        <MapPin class="size-4 shrink-0" aria-hidden="true" />{{ empresa.direccion }}
      </li>
      <li v-if="empresa.telefono" class="flex items-center gap-2">
        <Phone class="size-4 shrink-0" aria-hidden="true" />{{ formatearTelefono(empresa.telefono) }}
      </li>
      <li v-if="empresa.correo" class="flex items-center gap-2">
        <Mail class="size-4 shrink-0" aria-hidden="true" />{{ empresa.correo }}
      </li>
    </ul>
    <div v-permiso="'empresas.editar'" class="mt-auto flex justify-end">
      <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="emit('editar')">Editar</BotonBase>
    </div>
  </TarjetaBase>
</template>
