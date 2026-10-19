<script setup lang="ts">
import { Ban, Trash2 } from 'lucide-vue-next';
import { RouterLink, useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import LineasDelDocumento from '../componentes/documentos/LineasDelDocumento.vue';
import MotivosDelDocumento from '../componentes/documentos/MotivosDelDocumento.vue';
import NotasDelDocumento from '../componentes/documentos/NotasDelDocumento.vue';
import RetencionesDelDocumento from '../componentes/documentos/RetencionesDelDocumento.vue';
import SeccionDeFicha from '../componentes/documentos/SeccionDeFicha.vue';
import TotalesDelDocumento from '../componentes/documentos/TotalesDelDocumento.vue';
import VentanaDeAnulacion from '../componentes/documentos/VentanaDeAnulacion.vue';
import {
  detallesDeAnulacion,
  detallesDeEncabezado,
  textoDeEstado,
  tituloDeDocumento,
  tonoDeEstado,
} from '../composables/documentos/detalles-de-documento';
import { explicacionesDeAcciones, resumenDeAnulacion } from '../composables/documentos/reglas-de-baja-de-documento';
import { usarBajaDeDocumento } from '../composables/documentos/usar-baja-de-documento';
import { usarFichaDeDocumento } from '../composables/documentos/usar-ficha-de-documento';
import { VENTANA_DE_DOCUMENTOS } from '../textos-de-documentos';

/** La ficha de una factura o nota de crédito, con anular y eliminar. */
const props = defineProps<{ documentoId: string }>();

const router = useRouter();
const { ficha, cargando, conceptos, reemplazar } = usarFichaDeDocumento(() => props.documentoId);
const baja = usarBajaDeDocumento(ficha, reemplazar, () => router.replace({ name: 'libro-de-compras.documentos' }));
const volver = { texto: VENTANA_DE_DOCUMENTOS.titulo, ruta: { name: 'libro-de-compras.documentos' } };
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="tituloDeDocumento(ficha)" :descripcion="ficha.nombreEmisor" :volver="volver">
      <InsigniaBase class="self-center" :tono="tonoDeEstado(ficha.estado)">{{
        textoDeEstado(ficha.estado)
      }}</InsigniaBase>
      <BotonBase
        v-if="ficha.puedeAnular"
        v-permiso="'libro-de-compras.documentos.anular'"
        variante="secundario"
        :icono="Ban"
        @click="baja.abrirAnulacion"
      >
        Anular el registro (no anula la factura en la SAT)
      </BotonBase>
      <BotonBase
        v-if="ficha.puedeEliminar"
        v-permiso="'libro-de-compras.documentos.eliminar'"
        variante="secundario"
        :icono="Trash2"
        @click="baja.eliminar"
      >
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <p
      v-for="explicacion in explicacionesDeAcciones(ficha)"
      :key="explicacion"
      class="text-sm text-tierra-600 dark:text-tierra-300"
    >
      {{ explicacion }}
    </p>
    <SeccionDeFicha v-if="ficha.estado === 'anulado'" titulo="Registro anulado">
      <DatosDelRegistro :detalles="detallesDeAnulacion(ficha)" />
    </SeccionDeFicha>
    <MotivosDelDocumento :ficha="ficha" />
    <p v-if="ficha.documentoAfectadoId" class="text-sm">
      <RouterLink
        class="font-medium text-campo-700 underline dark:text-campo-300"
        :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: ficha.documentoAfectadoId } }"
      >
        Ver la factura que rebaja esta nota
      </RouterLink>
    </p>

    <SeccionDeFicha titulo="Datos del documento">
      <DatosDelRegistro :detalles="detallesDeEncabezado(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Totales"><TotalesDelDocumento :ficha="ficha" /></SeccionDeFicha>
    <SeccionDeFicha :titulo="`Líneas (${ficha.lineas.length})`">
      <LineasDelDocumento :lineas="ficha.lineas" :conceptos="conceptos" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Retenciones"><RetencionesDelDocumento :retenciones="ficha.retenciones" /></SeccionDeFicha>
    <SeccionDeFicha v-if="ficha.notas.length" :titulo="`Notas de crédito (${ficha.notas.length})`">
      <NotasDelDocumento :notas="ficha.notas" />
    </SeccionDeFicha>

    <VentanaDeAnulacion
      v-model="baja.edicion.value"
      :resumen="resumenDeAnulacion(ficha)"
      :puede-eliminar="ficha.puedeEliminar"
      :errores="baja.errores.value"
      :enviando="baja.enviando.value"
      @cerrar="baja.edicion.value.abierta = false"
      @guardar="baja.anular"
      @eliminar="baja.eliminar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
</template>
