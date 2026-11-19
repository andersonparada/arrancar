<script setup lang="ts">
import { Send } from 'lucide-vue-next';
import { textoDeLaPrueba } from '../../composables/correo/servidor-de-correo';
import type { ResultadoDelEnvio, ServidorDeCorreo } from '../../servicios/correo-de-soporte.api';
import { formatearFechaHora } from '../../utilidades/formato';
import BotonBase from '../BotonBase.vue';
import CampoTexto from '../CampoTexto.vue';
import InsigniaBase from '../InsigniaBase.vue';
import TarjetaBase from '../TarjetaBase.vue';

/** Manda un correo de prueba con el servidor guardado. Es el único lugar donde se escribe una dirección a mano. */
defineProps<{
  guardado: ServidorDeCorreo;
  probando: boolean;
  resultado: ResultadoDelEnvio | null;
  hayCambios: boolean;
}>();
const emit = defineEmits<{ probar: [] }>();
const destino = defineModel<string>({ required: true });
</script>

<template>
  <TarjetaBase>
    <form class="space-y-3" novalidate @submit.prevent="emit('probar')">
      <h2 class="font-semibold">Enviar prueba</h2>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Manda un correo real con lo que está guardado (no con lo que se está editando). Máximo 5 por hora.
      </p>
      <CampoTexto
        v-model="destino"
        etiqueta="Enviar a"
        tipo="email"
        requerido
        sin-correccion
        ayuda="Una dirección suya, para revisar que llegue."
      />
      <p v-if="hayCambios" class="text-xs text-tierra-500">Hay cambios sin guardar: guárdelos antes de probar.</p>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p v-if="guardado.ultimaPrueba" class="text-xs text-tierra-500" role="status">
          Última prueba, {{ formatearFechaHora(guardado.ultimaPrueba.en) }}:
          <InsigniaBase :tono="guardado.ultimaPrueba.resultado === 'enviado' ? 'campo' : 'rojo'">
            {{ guardado.ultimaPrueba.resultado === 'enviado' ? 'Correcta' : 'Falló' }}
          </InsigniaBase>
        </p>
        <span v-else />
        <BotonBase
          tipo="submit"
          variante="secundario"
          :icono="Send"
          :cargando="probando"
          :deshabilitado="!guardado.configurado || !destino.trim()"
        >
          Enviar prueba
        </BotonBase>
      </div>
      <p v-if="resultado && resultado !== 'enviado'" class="text-sm text-red-700 dark:text-red-300" role="alert">
        {{ textoDeLaPrueba(resultado) }}
      </p>
    </form>
  </TarjetaBase>
</template>
