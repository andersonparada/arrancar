<script setup lang="ts">
import { Check, Printer } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AvisoDeTamanoReal from '../componentes/formatos-de-cheque/AvisoDeTamanoReal.vue';
import HojaDeCheque from '../componentes/formatos-de-cheque/HojaDeCheque.vue';
import ReglaDeAlineacion from '../componentes/formatos-de-cheque/ReglaDeAlineacion.vue';
import VistaAEscala from '../componentes/formatos-de-cheque/VistaAEscala.vue';
import { usarPruebaDeAlineacion } from '../composables/formatos-de-cheque/usar-prueba-de-alineacion';
import { CLAVES_DE_PLANTILLA } from '../servicios/tipos-de-formatos-de-cheque';

/**
 * La hoja de prueba de alineación (`?formato=<id>` o `?plantilla=<clave>`): se imprime en una hoja en blanco, se pone
 * sobre un cheque contra la luz y se corrigen las medidas. No marca nada ni gasta cheques.
 */
const { query } = useRoute();
const formatoId = typeof query.formato === 'string' ? query.formato : undefined;
const plantilla = CLAVES_DE_PLANTILLA.find((clave) => clave === query.plantilla);
const { prueba, cargando, impresa, enviando, imprimir, marcarAlineada } = usarPruebaDeAlineacion({
  formatoId,
  plantilla,
});
const volver = { texto: 'Volver a los formatos de cheque', ruta: { name: 'bancos.formatos-de-cheque' } };
</script>

<template>
  <div v-if="prueba" class="space-y-4">
    <div class="space-y-4 print:hidden">
      <EncabezadoPagina
        :titulo="`Prueba de alineación: ${prueba.nombre}`"
        descripcion="Imprima esta hoja en papel blanco, póngala sobre un cheque contra la luz y compare. Si algo no coincide, corrija las medidas del formato."
        :volver="volver"
      >
        <BotonBase :icono="Printer" @click="imprimir">Imprimir prueba</BotonBase>
        <BotonBase
          v-if="formatoId && !prueba.probado"
          v-permiso="'bancos.formatos-de-cheque.editar'"
          variante="secundario"
          :icono="Check"
          :cargando="enviando"
          :deshabilitado="!impresa"
          @click="marcarAlineada"
        >
          La prueba quedó alineada
        </BotonBase>
      </EncabezadoPagina>
      <p v-if="prueba.probado" class="text-sm font-medium text-campo-700 dark:text-campo-400" role="status">
        Este formato ya pasó la prueba. Si cambia sus medidas, habrá que probarlo otra vez.
      </p>
      <p v-else-if="!formatoId" class="text-sm text-tierra-600 dark:text-tierra-300">
        Es una plantilla de fábrica sin formato propio: nunca figura como probada. Para dejar constancia, cree un
        formato a partir de ella.
      </p>
      <p v-else-if="!impresa" class="text-sm text-tierra-600 dark:text-tierra-300">
        «La prueba quedó alineada» se habilita después de imprimir la hoja.
      </p>
      <AvisoDeTamanoReal :avisos="prueba.cheque.avisos" />
    </div>

    <VistaAEscala :ancho-mm="prueba.cheque.papel.anchoMm" :alto-mm="prueba.cheque.papel.altoMm">
      <HojaDeCheque :cheque="prueba.cheque" rotulo="Hoja de prueba de alineación">
        <ReglaDeAlineacion
          :papel="prueba.cheque.papel"
          :desplazamiento="prueba.cheque.desplazamiento"
          :separacion-mm="prueba.reglaMm"
        />
      </HojaDeCheque>
    </VistaAEscala>
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando la hoja de prueba…</p>
</template>
