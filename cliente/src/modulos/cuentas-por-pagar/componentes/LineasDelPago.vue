<script setup lang="ts">
import { Scale } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeDocumento } from '../composables/detalles-de-documento';
import { diferenciaSaldadaDe, sePuedeSaldar, textoDeConstancias } from '../composables/pagos/ficha-de-pago';
import type { FichaDePago, LineaDeLaFicha } from '../servicios/tipos-de-pagos';

/**
 * Lo que el pago entregó a cada documento: lo pagado en dinero, la retención que se descontó (con su constancia), lo que
 * cubre y lo que el documento debe hoy. «Dar por saldada la diferencia» sale solo si el servidor la ofrece en esa línea.
 */
defineProps<{ ficha: FichaDePago; ocupado?: boolean }>();
defineEmits<{ saldar: [linea: LineaDeLaFicha] }>();
const sesion = usarSesion();
const hayRetencion = (linea: LineaDeLaFicha): boolean => linea.retencionesDelLibro.length > 0;
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="linea in ficha.aplicaciones"
      :key="linea.documentoId"
      class="rounded-xl p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
    >
      <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div class="min-w-0">
          <RouterLink
            v-if="sesion.puede('cuentas-por-pagar.documentos.ver')"
            :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: linea.documentoId } }"
            class="font-medium underline-offset-2 hover:underline"
          >
            {{ tituloDeDocumento(linea) }}
          </RouterLink>
          <span v-else class="font-medium">{{ tituloDeDocumento(linea) }}</span>
          <p class="text-sm text-tierra-600 dark:text-tierra-300">
            Contraseña
            <RouterLink
              v-if="sesion.puede('cuentas-por-pagar.contrasenas.ver')"
              :to="{ name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: linea.contrasena.id } }"
              class="underline-offset-2 hover:underline"
            >
              {{ linea.contrasena.numero }}
            </RouterLink>
            <template v-else>{{ linea.contrasena.numero }}</template>
            · total {{ formatearMonto(linea.total) }}
          </p>
        </div>
        <p class="text-right font-semibold">{{ formatearMonto(linea.monto) }}</p>
      </div>

      <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        <div v-if="hayRetencion(linea) || linea.retencionDescontada !== '0.00'">
          <dt class="text-xs text-tierra-500">Retención que se descontó</dt>
          <dd>{{ formatearMonto(linea.retencionDescontada) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Cubre del documento</dt>
          <dd>{{ formatearMonto(linea.cubre) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Debe hoy</dt>
          <dd>{{ formatearMonto(linea.saldoDelDocumento) }}</dd>
        </div>
      </dl>

      <ul v-if="hayRetencion(linea)" class="mt-2 space-y-0.5 text-xs text-tierra-600 dark:text-tierra-300">
        <li v-for="texto in textoDeConstancias(linea)" :key="texto">{{ texto }}</li>
      </ul>

      <p v-if="diferenciaSaldadaDe(ficha, linea.documentoId)" class="mt-2 text-sm text-campo-700 dark:text-campo-300">
        Diferencia saldada: {{ formatearMonto(diferenciaSaldadaDe(ficha, linea.documentoId) ?? '0') }}
      </p>
      <div v-if="sePuedeSaldar(ficha, linea)" v-permiso="'cuentas-por-pagar.ajustes.crear'" class="mt-2">
        <BotonBase
          variante="secundario"
          pequeno
          :icono="Scale"
          :deshabilitado="ocupado"
          :aria-label="`Dar por saldada la diferencia de ${formatearMonto(linea.diferenciaOfrecible)} de ${tituloDeDocumento(linea)}`"
          @click="$emit('saldar', linea)"
        >
          Dar por saldada la diferencia de {{ formatearMonto(linea.diferenciaOfrecible) }}
        </BotonBase>
      </div>
    </li>
  </ul>
</template>
