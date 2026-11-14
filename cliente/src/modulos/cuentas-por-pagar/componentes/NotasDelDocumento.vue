<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeEstado, tituloDeDocumento, tonoDeEstado } from '../composables/detalles-de-documento';
import type { FichaDelDocumento } from '../servicios/tipos';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** Las notas que corrigen el documento. */
defineProps<{ ficha: FichaDelDocumento }>();
const enlaceA = (id: string) => ({ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: id } });
</script>

<template>
  <SeccionDeFicha v-if="ficha.notas.length" :titulo="`Notas que lo corrigen (${ficha.notas.length})`">
    <ul class="space-y-2">
      <li v-for="nota in ficha.notas" :key="nota.id">
        <TarjetaBase class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <RouterLink :to="enlaceA(nota.id)" class="font-medium text-campo-700 underline dark:text-campo-300">
            {{ tituloDeDocumento(nota) }}
          </RouterLink>
          <span class="text-tierra-600 dark:text-tierra-300">
            {{ formatearFecha(nota.fechaEmision) }} · {{ formatearMonto(nota.total) }}
            <template v-if="nota.tipo === 'nota_de_credito'">
              · rebajó {{ formatearMonto(nota.aplicadoAEsteDocumento) }}
            </template>
          </span>
          <InsigniaBase :tono="tonoDeEstado(nota.estado)">{{ textoDeEstado(nota.estado) }}</InsigniaBase>
        </TarjetaBase>
      </li>
    </ul>
  </SeccionDeFicha>
</template>
