<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  etiquetaDeDesde,
  etiquetaDeHasta,
  motivoParaNoQuitar,
  puedeQuitarseLaVigencia,
} from '../composables/vigencia-fiscal';
import type { VigenciaFiscal } from '../servicios/libro-de-compras.api';
import { REGIMENES_DE_IVA, TEXTOS_DE_HISTORIAL as T, TIPOS_DE_PERSONA } from '../textos';

/** El historial de vigencias fiscales de la empresa, de la más antigua a la más nueva. */
defineProps<{ historial: VigenciaFiscal[]; quitando: string | null }>();
defineEmits<{ quitar: [vigencia: VigenciaFiscal] }>();
</script>

<template>
  <TarjetaBase>
    <h3 class="mb-3 font-semibold text-tierra-800 dark:text-tierra-100">{{ T.titulo }}</h3>
    <ol class="space-y-2">
      <li
        v-for="vigencia in historial"
        :key="vigencia.id"
        class="flex flex-wrap items-start justify-between gap-2 rounded-lg p-3 ring-1 ring-tierra-200 dark:ring-tierra-700"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-tierra-800 dark:text-tierra-100">
            {{ etiquetaDeDesde(vigencia.vigenteDesde) }}
            <span class="text-tierra-500">→</span>
            <InsigniaBase v-if="vigencia.vigenteHasta === null" tono="campo">{{ T.vigente }}</InsigniaBase>
            <template v-else>{{ etiquetaDeHasta(vigencia) }}</template>
          </p>
          <p class="mt-0.5 break-words text-sm text-tierra-700 dark:text-tierra-300">
            {{ REGIMENES_DE_IVA[vigencia.regimenIva] }} · {{ TIPOS_DE_PERSONA[vigencia.tipoDePersona] }}
          </p>
          <p v-if="motivoParaNoQuitar(vigencia)" class="mt-0.5 text-xs text-tierra-500">
            {{ motivoParaNoQuitar(vigencia) }}
          </p>
        </div>
        <BotonBase
          v-if="puedeQuitarseLaVigencia(vigencia)"
          v-permiso="'empresas.editar'"
          variante="secundario"
          pequeno
          :icono="Trash2"
          :cargando="quitando === vigencia.id"
          :aria-label="`Quitar la vigencia desde ${etiquetaDeDesde(vigencia.vigenteDesde)}`"
          @click="$emit('quitar', vigencia)"
        >
          Quitar
        </BotonBase>
      </li>
    </ol>
  </TarjetaBase>
</template>
