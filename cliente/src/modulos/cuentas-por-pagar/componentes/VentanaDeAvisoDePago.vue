<script setup lang="ts">
import { Paperclip, Send } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import {
  ADVERTENCIA_DE_AVISO_POR_SALIR,
  AVISO_DEL_PDF,
  MAXIMO_DE_DESTINATARIOS,
  hayAvisoPorSalir,
  llaveDe,
  sePuedeEnviarLaEdicion,
  type EdicionDeAviso,
} from '../composables/pagos/aviso-de-pago';
import type { AvisoDePago, DestinatarioPosible } from '../servicios/tipos-de-avisos-de-pago';

/**
 * Enviar el aviso de un pago: a quién (solo correos ya registrados, con los marcados «recibe avisos de pago»
 * preseleccionados), la copia a la empresa y cómo quedará el mensaje. Si falta un correo, se agrega al contacto.
 */
defineProps<{ aviso: AvisoDePago; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; enviar: []; alternar: [posible: DestinatarioPosible] }>();
const edicion = defineModel<EdicionDeAviso>({ required: true });
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Enviar aviso de pago" ancha @cerrar="emit('cerrar')">
    <form id="form-aviso-de-pago" class="space-y-4 text-sm" novalidate @submit.prevent="emit('enviar')">
      <p
        v-if="hayAvisoPorSalir(aviso.enviados)"
        class="rounded-xl bg-trigo-300/30 p-3 dark:bg-trigo-500/10"
        role="alert"
      >
        {{ ADVERTENCIA_DE_AVISO_POR_SALIR }}
      </p>
      <fieldset>
        <legend class="mb-1 font-medium">Enviar a</legend>
        <ul class="space-y-1.5">
          <li v-for="posible in aviso.posibles" :key="llaveDe(posible)">
            <label class="flex items-start gap-2" :class="{ 'opacity-60': !posible.utilizable }">
              <input
                type="checkbox"
                class="mt-0.5 size-4 rounded"
                :checked="edicion.marcados.includes(llaveDe(posible))"
                :disabled="!posible.utilizable"
                @change="emit('alternar', posible)"
              />
              <span class="min-w-0">
                <span class="font-medium">{{ posible.nombre }}</span>
                <span class="ml-1 break-all text-tierra-600 dark:text-tierra-300">{{ posible.direccion }}</span>
                <InsigniaBase v-if="posible.origen === 'tercero'" class="ml-1">Correo principal</InsigniaBase>
                <span v-if="posible.motivo" class="block text-xs text-red-700 dark:text-red-300">
                  {{ posible.motivo }}
                </span>
              </span>
            </label>
          </li>
        </ul>
        <p v-if="edicion.marcados.length > MAXIMO_DE_DESTINATARIOS" class="mt-1 text-xs text-red-700" role="alert">
          Un aviso no puede ir a más de {{ MAXIMO_DE_DESTINATARIOS }} destinatarios.
        </p>
      </fieldset>

      <label v-if="aviso.copiaALaEmpresa" class="flex items-start gap-2">
        <input v-model="edicion.conCopia" type="checkbox" class="mt-0.5 size-4 rounded" />
        <span>
          Copia a la empresa
          <span class="break-all text-tierra-600 dark:text-tierra-300">({{ aviso.copiaALaEmpresa }})</span>
          <span class="block text-xs text-tierra-500">
            El proveedor la ve en copia y sus respuestas llegan a ese correo.
          </span>
        </span>
      </label>
      <p v-else class="text-xs text-tierra-500">
        La empresa no tiene un correo que sirva para enviar: no se le manda copia ni se recibirán respuestas.
      </p>

      <div class="space-y-2 rounded-xl bg-tierra-100/70 p-3 dark:bg-tierra-800">
        <p class="text-xs text-tierra-500">Así se verá el mensaje</p>
        <p class="font-medium break-words">{{ aviso.vistaPrevia.asunto }}</p>
        <pre class="font-sans whitespace-pre-wrap">{{ aviso.vistaPrevia.mensaje }}</pre>
        <template v-if="aviso.vistaPrevia.adjuntoNombre">
          <p class="flex items-center gap-1 text-xs text-tierra-600 dark:text-tierra-300">
            <Paperclip class="size-3" aria-hidden="true" />{{ aviso.vistaPrevia.adjuntoNombre }}
          </p>
          <p class="text-xs text-tierra-500">{{ AVISO_DEL_PDF }}</p>
        </template>
      </div>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase
        tipo="submit"
        form="form-aviso-de-pago"
        :icono="Send"
        :cargando="enviando"
        :deshabilitado="!sePuedeEnviarLaEdicion(edicion)"
      >
        Enviar aviso
      </BotonBase>
    </template>
  </VentanaModal>
</template>
