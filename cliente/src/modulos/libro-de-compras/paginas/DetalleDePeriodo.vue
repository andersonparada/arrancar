<script setup lang="ts">
import { LockOpen, Send } from 'lucide-vue-next';
import { computed, reactive } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import CambiosDesdeLaDeclaracion from '../componentes/periodos/CambiosDesdeLaDeclaracion.vue';
import HistorialDelPeriodo from '../componentes/periodos/HistorialDelPeriodo.vue';
import RevisionDelPeriodo from '../componentes/periodos/RevisionDelPeriodo.vue';
import VentanaDeDeclaracion from '../componentes/periodos/VentanaDeDeclaracion.vue';
import SeccionDeFicha from '../componentes/documentos/SeccionDeFicha.vue';
import VentanaDeMotivo from '../componentes/retenciones/VentanaDeMotivo.vue';
import {
  nombreDelPeriodo,
  resumenDeDeclarar,
  resumenDeReabrir,
  textoDelEstado,
  tonoDelEstado,
} from '../composables/periodos/datos-de-periodos';
import { usarDetalleDePeriodo } from '../composables/periodos/usar-detalle-de-periodo';
import { DETALLE_DE_PERIODO as textos, VENTANA_DE_PERIODOS, VENTANA_DE_REAPERTURA } from '../textos-de-periodos';

/** Un período: su estado, historial, lo que cambió desde la declaración, lo que revisar, y declarar o reabrir. */
const props = defineProps<{ periodo: string }>();
const { detalle, cargando, acciones, declaracion: declarar, reapertura } = usarDetalleDePeriodo(() => props.periodo);
const declaracion = reactive(declarar);
const reabrir = reactive(reapertura);
const volver = { texto: textos.volver, ruta: { name: 'libro-de-compras.periodos' } };
const resumenDelDeclarar = computed(() =>
  detalle.value
    ? resumenDeDeclarar(
        detalle.value.periodo,
        detalle.value.control,
        detalle.value.cambioDesdeLaDeclaracion?.cambios.length ?? 0,
      )
    : [],
);
</script>

<template>
  <div v-if="detalle && acciones" class="min-w-0 space-y-6">
    <EncabezadoPagina :titulo="nombreDelPeriodo(detalle.periodo.periodo)" :volver="volver">
      <InsigniaBase class="self-center" :tono="tonoDelEstado(detalle.periodo)">{{
        textoDelEstado(detalle.periodo)
      }}</InsigniaBase>
      <BotonBase
        v-if="acciones.puedeDeclarar"
        v-permiso="'libro-de-compras.periodos.declarar'"
        :icono="Send"
        @click="declaracion.abrir"
      >
        {{ acciones.esRectificacion ? textos.rectificar : textos.declarar }}
      </BotonBase>
      <BotonBase
        v-if="acciones.puedeReabrir"
        v-permiso="'libro-de-compras.periodos.reabrir'"
        variante="secundario"
        :icono="LockOpen"
        @click="reabrir.abrir(true)"
      >
        {{ textos.reabrir }}
      </BotonBase>
    </EncabezadoPagina>

    <p v-if="acciones.porQueNoDeclarar" class="text-sm text-tierra-600 dark:text-tierra-300">
      {{ acciones.porQueNoDeclarar }}
    </p>
    <SeccionDeFicha v-if="acciones.puedeDeclarar" :titulo="textos.revision">
      <RevisionDelPeriodo :revision="detalle.revision" />
    </SeccionDeFicha>
    <SeccionDeFicha v-if="detalle.cambioDesdeLaDeclaracion" :titulo="textos.cambios">
      <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">{{ textos.cambiosAyuda }}</p>
      <CambiosDesdeLaDeclaracion :cambio="detalle.cambioDesdeLaDeclaracion" />
    </SeccionDeFicha>
    <SeccionDeFicha :titulo="textos.historial"><HistorialDelPeriodo :historial="detalle.historial" /></SeccionDeFicha>

    <VentanaDeDeclaracion
      v-model="declaracion.edicion"
      :abierta="declaracion.abierta"
      :rectificacion="acciones.esRectificacion"
      :resumen="resumenDelDeclarar"
      :enviando="declaracion.enviando"
      :errores="declaracion.errores"
      @guardar="declaracion.guardar(acciones.esRectificacion)"
      @cerrar="declaracion.abierta = false"
    />
    <VentanaDeMotivo
      v-model="reabrir.motivo"
      :abierta="reabrir.abierta"
      :titulo="VENTANA_DE_REAPERTURA.titulo"
      :resumen="resumenDeReabrir(detalle.periodo, detalle.control)"
      :ayuda="VENTANA_DE_REAPERTURA.ayuda"
      :boton="VENTANA_DE_REAPERTURA.boton"
      :enviando="reabrir.enviando"
      :errores="reabrir.errores"
      @guardar="reabrir.guardar"
      @cerrar="reabrir.abierta = false"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">{{ VENTANA_DE_PERIODOS.detalle }}: cargando…</p>
</template>
