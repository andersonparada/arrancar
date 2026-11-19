<script setup lang="ts">
import { RotateCcw, Ban } from 'lucide-vue-next';
import {
  fechaDelEstado,
  nombreDelEstado,
  sePuedeCancelar,
  sePuedeReintentar,
  tonoDelEstado,
} from '../../composables/correo/estado-del-correo';
import { nombreDelTipoDeCorreo } from '../../composables/correo/servidor-de-correo';
import type { CorreoFicha } from '../../servicios/correos.api';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import InsigniaBase from '../InsigniaBase.vue';
import VentanaModal from '../VentanaModal.vue';

/** La ficha de un correo: a quién, cómo salió, el texto enviado (30 días) y, según su estado, cancelarlo o reintentarlo. */
defineProps<{ correo: CorreoFicha | null; reintentando: boolean }>();
const emit = defineEmits<{ cerrar: []; cancelar: []; reintentar: [] }>();
</script>

<template>
  <VentanaModal :abierta="correo !== null" :titulo="correo?.asunto ?? 'Correo'" ancha @cerrar="emit('cerrar')">
    <div v-if="correo" class="space-y-4 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <InsigniaBase :tono="tonoDelEstado(correo.estado)">{{ nombreDelEstado(correo) }}</InsigniaBase>
        <span class="text-tierra-600 dark:text-tierra-300">{{ fechaDelEstado(correo) }}</span>
        <span class="text-tierra-500">· {{ nombreDelTipoDeCorreo(correo.tipo) }}</span>
      </div>
      <p v-if="correo.motivoDeCancelacion"><b>Motivo de la cancelación:</b> {{ correo.motivoDeCancelacion }}</p>
      <p
        v-if="correo.estado === 'fallido'"
        class="rounded-xl bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200"
      >
        No se pudo enviar después de {{ correo.intentos }} intentos. Avise a soporte si se repite.
      </p>
      <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt class="text-xs text-tierra-500">Remitente</dt>
          <dd>{{ correo.nombreVisible }}</dd>
        </div>
        <div v-if="correo.responderA">
          <dt class="text-xs text-tierra-500">Responder a</dt>
          <dd class="break-all">{{ correo.responderA }}</dd>
        </div>
        <div v-if="correo.adjuntoNombre">
          <dt class="text-xs text-tierra-500">Adjunto</dt>
          <dd class="break-all">{{ correo.adjuntoNombre }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Creado</dt>
          <dd>{{ formatearFechaHora(correo.creadoEn) }}</dd>
        </div>
      </dl>
      <div>
        <h3 class="mb-1 font-medium">Destinatarios</h3>
        <ul class="space-y-1">
          <li v-for="d in correo.destinatarios" :key="d.direccion" class="flex flex-wrap items-center gap-2">
            <span class="break-all">{{ d.nombre ? `${d.nombre} <${d.direccion}>` : d.direccion }}</span>
            <InsigniaBase>{{ d.clase === 'copia' ? 'Copia' : 'Para' }}</InsigniaBase>
            <InsigniaBase v-if="d.resultado" :tono="d.resultado === 'aceptado' ? 'campo' : 'rojo'">
              {{ d.resultado === 'aceptado' ? 'Aceptado' : 'Rechazado' }}
            </InsigniaBase>
          </li>
        </ul>
      </div>
      <div>
        <h3 class="mb-1 font-medium">Mensaje</h3>
        <pre
          v-if="correo.cuerpoTexto"
          class="max-h-72 overflow-y-auto rounded-xl bg-tierra-100/70 p-3 font-sans whitespace-pre-wrap dark:bg-tierra-800"
          >{{ correo.cuerpoTexto }}</pre>
        <p v-else class="text-tierra-500">El texto ya se depuró: solo se conservan los datos del envío.</p>
      </div>
    </div>
    <template v-if="correo && (sePuedeCancelar(correo) || sePuedeReintentar(correo))" #pie>
      <BotonBase
        v-if="sePuedeCancelar(correo)"
        v-permiso="'correos.cancelar'"
        variante="peligro"
        :icono="Ban"
        @click="emit('cancelar')"
      >
        Cancelar envío
      </BotonBase>
      <BotonBase
        v-if="sePuedeReintentar(correo)"
        v-permiso="'correos.reintentar'"
        :icono="RotateCcw"
        :cargando="reintentando"
        @click="emit('reintentar')"
      >
        Reintentar
      </BotonBase>
    </template>
  </VentanaModal>
</template>
