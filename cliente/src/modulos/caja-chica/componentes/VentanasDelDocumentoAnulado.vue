<script setup lang="ts">
import { tituloDeComprobante } from '../composables/comprobantes/detalles-de-comprobante';
import type { AccionesDeComprobantesEnVista } from '../composables/comprobantes/usar-acciones-de-comprobantes';
import VentanaDeDisputa from './VentanaDeDisputa.vue';
import VentanaDeMotivo from './VentanaDeMotivo.vue';
import VentanaDeSalidaDelDocumento from './VentanaDeSalidaDelDocumento.vue';

/** Las ventanas de un documento anulado por su emisor: resolver, poner en disputa y retirar la disputa. */
defineProps<{ documentoAnulado: AccionesDeComprobantesEnVista['documentoAnulado'] }>();
</script>

<template>
  <VentanaDeSalidaDelDocumento
    :model-value="documentoAnulado.salida.edicion"
    :abierta="documentoAnulado.salida.abierta"
    :enviando="documentoAnulado.salida.enviando"
    :errores="documentoAnulado.salida.errores"
    :cargando="documentoAnulado.reemplazos.cargando"
    :comprobante="documentoAnulado.objetivo"
    :candidatos="documentoAnulado.reemplazos.candidatos"
    @cerrar="documentoAnulado.salida.cerrar"
    @guardar="documentoAnulado.salida.guardar"
  />
  <VentanaDeDisputa
    :model-value="documentoAnulado.disputa.edicion"
    :abierta="documentoAnulado.disputa.abierta"
    :enviando="documentoAnulado.disputa.enviando"
    :errores="documentoAnulado.disputa.errores"
    @cerrar="documentoAnulado.disputa.cerrar"
    @guardar="documentoAnulado.disputa.guardar"
  />
  <VentanaDeMotivo
    :model-value="documentoAnulado.retiro.edicion"
    :abierta="documentoAnulado.retiro.abierta"
    titulo="Retirar la disputa"
    :resumen="`${documentoAnulado.objetivo ? tituloDeComprobante(documentoAnulado.objetivo) : 'El documento'} vuelve a «por resolver». Seguirá sin dar crédito fiscal hasta que se resuelva.`"
    texto-del-boton="Retirar la disputa"
    :enviando="documentoAnulado.retiro.enviando"
    :errores="documentoAnulado.retiro.errores"
    @cerrar="documentoAnulado.retiro.cerrar"
    @guardar="documentoAnulado.retiro.guardar"
  />
</template>
