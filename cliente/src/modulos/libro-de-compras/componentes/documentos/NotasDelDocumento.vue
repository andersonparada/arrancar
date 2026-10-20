<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeEstado, tonoDeEstado } from '../../composables/documentos/detalles-de-documento';
import type { NotaDeFactura } from '../../servicios/documentos.api';

/** Las notas (de crédito o de débito) de un grupo de la ficha; cada una lleva a su propia ficha. */
defineProps<{ notas: NotaDeFactura[] }>();
</script>

<template>
  <ul class="space-y-2">
    <li v-for="nota in notas" :key="nota.id">
      <RouterLink
        :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: nota.id } }"
        class="block rounded-2xl focus-visible:ring-2 focus-visible:ring-campo-500 focus-visible:outline-none"
      >
        <TarjetaBase class="flex items-center justify-between gap-3 transition hover:shadow-md">
          <div class="min-w-0">
            <p class="truncate font-medium">Nota {{ nota.serie ? `${nota.serie}-${nota.numero}` : nota.numero }}</p>
            <p class="text-sm text-tierra-600 dark:text-tierra-300">
              {{ formatearFecha(nota.fechaEmision) }} · {{ formatearMonto(nota.total) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <InsigniaBase :tono="tonoDeEstado(nota.estado)">{{ textoDeEstado(nota.estado) }}</InsigniaBase>
            <ChevronRight class="size-4 text-tierra-400" aria-hidden="true" />
          </div>
        </TarjetaBase>
      </RouterLink>
    </li>
  </ul>
</template>
