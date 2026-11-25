<script setup lang="ts">
import { computed } from 'vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { DESTINOS_DE_DOCUMENTO, TIPOS_DE_IDENTIFICACION } from '../../textos-de-documentos';

/** Lo que casi nunca se toca: el receptor tal como salió en el DTE, el destino, el IVA del DTE y las observaciones. */
const props = defineProps<{ conCartera: boolean; errores: Record<string, string>; pideElIva: boolean }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

const identificaciones = [
  { valor: '', texto: 'Según el cliente' },
  ...Object.entries(TIPOS_DE_IDENTIFICACION).map(([valor, texto]) => ({ valor, texto })),
];
const destinos = computed(() => [
  { valor: '', texto: 'Según la configuración' },
  ...Object.entries(DESTINOS_DE_DOCUMENTO).map(([valor, texto]) => ({ valor, texto })),
]);
</script>

<template>
  <TarjetaBase>
    <details :open="Object.keys(errores).length > 0">
      <summary class="cursor-pointer font-semibold">Más datos (receptor, destino, IVA del DTE y observaciones)</summary>
      <div class="mt-4 space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CampoSelector
            v-model="edicion.tipoDeIdentificacion"
            etiqueta="Identificación del receptor"
            :opciones="identificaciones"
            :error="errores.tipoDeIdentificacion"
          />
          <CampoTexto v-model="edicion.nitReceptor" etiqueta="NIT o CUI" sin-correccion :error="errores.nitReceptor" />
          <CampoTexto v-model="edicion.nombreReceptor" etiqueta="Nombre en el DTE" :error="errores.nombreReceptor" />
        </div>
        <p class="text-xs text-tierra-500">
          Déjelos vacíos para usar los datos del cliente. Escríbalos si el comprador pidió la factura con otro NIT o
          nombre.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoSelector
            v-if="props.conCartera"
            v-model="edicion.destino"
            etiqueta="Destino"
            :opciones="destinos"
            :error="errores.destino"
          />
          <CampoTexto
            v-if="!pideElIva"
            v-model="edicion.ivaDelDte"
            etiqueta="IVA según el DTE"
            tipo="text"
            ayuda="Solo si el DTE trae un IVA distinto del calculado (por centavos)."
            :error="errores.ivaDelDte"
          />
        </div>
        <CampoTexto
          v-model="edicion.observaciones"
          etiqueta="Observaciones"
          multilinea
          :longitud-maxima="500"
          :error="errores.observaciones"
        />
      </div>
    </details>
  </TarjetaBase>
</template>
