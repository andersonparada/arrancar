<script setup lang="ts">
import { Ban, Printer } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { resumenDeAnularReintegro } from '../composables/reintegros/reintegro';
import type { ReintegroDelDocumento } from '../servicios/tipos-de-reintegros';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** Lo que el proveedor devolvió de esta nota, vigentes y anulados: «Recibo» para imprimirlo y «Anular» con motivo. */
defineProps<{ reintegros: ReintegroDelDocumento[] }>();
const emit = defineEmits<{ anular: [id: string, resumen: string] }>();
const FORMAS = { deposito: 'Depósito', efectivo: 'Efectivo' } as const;

function anular({ reintegroId, forma, numero, monto }: ReintegroDelDocumento): void {
  emit('anular', reintegroId, resumenDeAnularReintegro(forma, numero, monto));
}
</script>

<template>
  <SeccionDeFicha v-if="reintegros.length" :titulo="`Reintegros (${reintegros.length})`">
    <ul class="space-y-2">
      <li v-for="reintegro in reintegros" :key="reintegro.reintegroId">
        <TarjetaBase class="space-y-2 text-sm" :class="{ 'opacity-70': reintegro.estado === 'anulado' }">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium">
              Reintegro {{ reintegro.numero }} · {{ FORMAS[reintegro.forma] }} · {{ formatearFecha(reintegro.fecha) }}
            </span>
            <span class="flex items-center gap-2">
              <InsigniaBase v-if="reintegro.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
              <strong :class="{ 'line-through': reintegro.estado === 'anulado' }">
                {{ formatearMonto(reintegro.monto) }}
              </strong>
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <RouterLink
              :to="{ name: 'cuentas-por-pagar.reintegros.recibo', params: { id: reintegro.reintegroId } }"
              class="inline-flex items-center gap-1.5 font-medium text-campo-700 underline dark:text-campo-300"
            >
              <Printer class="size-4" aria-hidden="true" />
              Recibo
            </RouterLink>
            <BotonBase
              v-if="reintegro.estado === 'vigente'"
              v-permiso="'cuentas-por-pagar.reintegros.anular'"
              variante="secundario"
              pequeno
              :icono="Ban"
              @click="anular(reintegro)"
            >
              Anular
            </BotonBase>
          </div>
        </TarjetaBase>
      </li>
    </ul>
  </SeccionDeFicha>
</template>
