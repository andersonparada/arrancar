<script setup lang="ts">
import { Save } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { AYUDA_DEL_ENVIO, OPCIONES_DE_ENVIO, marcadoresEnTexto } from '../composables/avisos/ajustes-del-aviso';
import type { AjustesDelAviso, AjustesDelAvisoConAyuda } from '../servicios/tipos-de-avisos-de-pago';

/**
 * Los avisos de pago de la empresa: cuándo salen, el texto del correo y si lleva el comprobante y copia a la empresa.
 * Los textos admiten marcadores como `{numero}`; el servidor rechaza los que no existen.
 */
defineProps<{
  ayuda: AjustesDelAvisoConAyuda;
  errores: Record<string, string>;
  enviando: boolean;
  hayCambios: boolean;
}>();
const emit = defineEmits<{ guardar: [] }>();
const borrador = defineModel<AjustesDelAviso>({ required: true });
</script>

<template>
  <TarjetaBase>
    <form class="space-y-5" novalidate @submit.prevent="emit('guardar')">
      <CampoSelector
        v-model="borrador.envio"
        etiqueta="Cuándo se manda el aviso"
        :opciones="OPCIONES_DE_ENVIO"
        :error="errores.envio"
        requerido
      />
      <p class="-mt-3 text-xs text-tierra-500">{{ AYUDA_DEL_ENVIO[borrador.envio] }}</p>
      <CampoTexto
        v-model="borrador.asunto"
        etiqueta="Asunto"
        requerido
        :longitud-maxima="150"
        contar
        :ayuda="`Marcadores: ${marcadoresEnTexto(ayuda.marcadoresDelAsunto)}. No admite el monto ni los documentos.`"
        :error="errores.asunto"
      />
      <CampoTexto
        v-model="borrador.mensaje"
        etiqueta="Mensaje"
        requerido
        multilinea
        :longitud-maxima="2000"
        contar
        :ayuda="`Marcadores: ${marcadoresEnTexto(ayuda.marcadoresDelMensaje)}. {adjunto} es la frase «Adjuntamos el comprobante del pago.» y solo sale si se adjunta.`"
        :error="errores.mensaje"
      />
      <CampoInterruptor
        v-model="borrador.adjuntarComprobante"
        etiqueta="Adjuntar el comprobante en PDF"
        descripcion="Lleva montos, NIT y retenciones: el proveedor lo recibe tal cual."
      />
      <CampoInterruptor
        v-model="borrador.copiaALaEmpresa"
        etiqueta="Copia a la empresa"
        descripcion="Manda copia visible al correo de la empresa, que también es el «Responder a»."
      />
      <div class="flex justify-end">
        <BotonBase tipo="submit" :icono="Save" :cargando="enviando" :deshabilitado="!hayCambios">Guardar</BotonBase>
      </div>
    </form>
  </TarjetaBase>
</template>
