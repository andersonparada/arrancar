<script setup lang="ts">
import { Mail, Send } from 'lucide-vue-next';
import { ref } from 'vue';
import {
  fechaDelEstado,
  nombreDelEstado,
  resumenDeDestinatarios,
  sePuedeCancelar,
  tonoDelEstado,
} from '@/modulos/core/composables/correo/estado-del-correo';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import {
  AVISOS_VISIBLES_EN_LA_FICHA,
  RECORDATORIO_DE_ANULACION,
  avisosVisibles,
  estadoDelUltimoAviso,
  hayQueAvisarLaAnulacion,
  textoDelBotonDeAviso,
} from '../composables/pagos/aviso-de-pago';
import type { AvisoDePago } from '../servicios/tipos-de-avisos-de-pago';

/**
 * El aviso por correo de un pago: cómo va el último, los envíos que ya hay (con «Cancelar» en los pendientes) y el botón
 * para enviar o reenviar. Cada envío es un correo nuevo; lo que ya salió no se puede detener.
 */
defineProps<{ aviso: AvisoDePago | null; cargando: boolean; anulado: boolean }>();
const verTodos = ref(false);
const emit = defineEmits<{ enviar: []; cancelar: [correoId: string] }>();
</script>

<template>
  <TarjetaBase v-if="aviso" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="flex items-center gap-2 text-sm font-medium">
        <Mail class="size-4 text-tierra-500" aria-hidden="true" />
        {{ estadoDelUltimoAviso(aviso.enviados) }}
      </p>
      <BotonBase
        v-if="aviso.sePuedeEnviar"
        v-permiso="'cuentas-por-pagar.pagos.enviar-aviso'"
        variante="secundario"
        :icono="Send"
        @click="emit('enviar')"
      >
        {{ textoDelBotonDeAviso(aviso.enviados) }}
      </BotonBase>
    </div>
    <p v-if="aviso.motivoSinAviso && !anulado" class="text-sm text-tierra-600 dark:text-tierra-300">
      {{ aviso.motivoSinAviso }}
    </p>
    <p
      v-if="hayQueAvisarLaAnulacion(anulado, aviso.enviados)"
      class="rounded-xl bg-trigo-300/30 p-3 text-sm dark:bg-trigo-500/10"
      role="status"
    >
      {{ RECORDATORIO_DE_ANULACION }}
    </p>
    <p
      v-if="aviso.envio === 'automatico' && aviso.sePuedeEnviar && !aviso.enviados.length"
      class="text-xs text-tierra-500"
    >
      Esta empresa manda el aviso sola al registrar el pago; si este no salió, envíelo con el botón.
    </p>
    <ul v-if="aviso.enviados.length" class="divide-y divide-tierra-100 text-sm dark:divide-tierra-700">
      <li
        v-for="correo in avisosVisibles(aviso.enviados, verTodos)"
        :key="correo.id"
        class="flex flex-wrap items-center gap-2 py-2"
      >
        <InsigniaBase :tono="tonoDelEstado(correo.estado)">{{ nombreDelEstado(correo) }}</InsigniaBase>
        <span class="min-w-0 break-all">{{ resumenDeDestinatarios(correo) }}</span>
        <span class="text-xs text-tierra-500">{{ fechaDelEstado(correo) }}</span>
        <BotonBase
          v-if="sePuedeCancelar(correo)"
          v-permiso="'cuentas-por-pagar.pagos.enviar-aviso'"
          class="ml-auto"
          variante="fantasma"
          pequeno
          @click="emit('cancelar', correo.id)"
        >
          Cancelar
        </BotonBase>
      </li>
    </ul>
    <BotonBase
      v-if="aviso.enviados.length > AVISOS_VISIBLES_EN_LA_FICHA"
      variante="fantasma"
      pequeno
      @click="verTodos = !verTodos"
    >
      {{ verTodos ? 'Ver solo los últimos' : `Ver todos (${aviso.enviados.length})` }}
    </BotonBase>
  </TarjetaBase>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando el aviso…</p>
</template>
