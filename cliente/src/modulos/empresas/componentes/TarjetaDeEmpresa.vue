<script setup lang="ts">
import { Building2, ChevronRight, Mail, MapPin, Phone } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { Empresa } from '../servicios/empresas.api';

/** La tarjeta de una empresa en la lista: toda ella lleva a su ficha, donde se edita. */
defineProps<{ empresa: Empresa; enUso: boolean }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'empresas.ficha', params: { empresaId: empresa.id } }"
    class="block h-full rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
  >
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
        <ChevronRight class="size-4 shrink-0 text-tierra-400" aria-hidden="true" />
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
    </TarjetaBase>
  </RouterLink>
</template>
