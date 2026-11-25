<script setup lang="ts">
import { Ban, Trash2 } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AvisosDelRegistro from '../componentes/documentos/AvisosDelRegistro.vue';
import LineasDelDocumento from '../componentes/documentos/LineasDelDocumento.vue';
import NotasDelDocumento from '../componentes/documentos/NotasDelDocumento.vue';
import SeccionDeFicha from '../componentes/documentos/SeccionDeFicha.vue';
import TotalesDelDocumento from '../componentes/documentos/TotalesDelDocumento.vue';
import VentanaDeAnulacion from '../componentes/documentos/VentanaDeAnulacion.vue';
import { tomarAvisosDelRegistro } from '../composables/documentos/avisos-del-registro';
import {
  detallesDeAnulacion,
  detallesDeEncabezado,
  textoDeEstado,
  tonoDeEstado,
} from '../composables/documentos/detalles-de-documento';
import { explicacionesDeAcciones, resumenDeAnulacion } from '../composables/documentos/reglas-de-baja-de-documento';
import { tituloDeDocumento } from '../composables/documentos/tipos-de-documento';
import { usarBajaDeDocumento } from '../composables/documentos/usar-baja-de-documento';
import { usarFichaDeDocumento } from '../composables/documentos/usar-ficha-de-documento';
import { VENTANA_DE_DOCUMENTOS } from '../textos-de-documentos';

/** La ficha de un documento de venta, con anular y eliminar. */
const props = defineProps<{ documentoId: string }>();

const router = useRouter();
// Si se llegó desde el registro, trae los avisos del servidor (se entregan una sola vez).
const avisosDelRegistro = ref(tomarAvisosDelRegistro(props.documentoId));
const { ficha, cargando, reemplazar } = usarFichaDeDocumento(() => props.documentoId);
const baja = usarBajaDeDocumento(ficha, reemplazar, () => router.replace({ name: 'libro-de-ventas.documentos' }));
const volver = { texto: VENTANA_DE_DOCUMENTOS.titulo, ruta: { name: 'libro-de-ventas.documentos' } };
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="tituloDeDocumento(ficha)" :descripcion="ficha.nombreReceptor" :volver="volver">
      <InsigniaBase class="self-center" :tono="tonoDeEstado(ficha.estado)">{{
        textoDeEstado(ficha.estado)
      }}</InsigniaBase>
      <BotonBase
        v-if="ficha.puedeAnular"
        v-permiso="'libro-de-ventas.documentos.anular'"
        variante="secundario"
        :icono="Ban"
        @click="baja.abrirAnulacion"
      >
        Anular el registro
      </BotonBase>
      <BotonBase
        v-if="ficha.puedeEliminar"
        v-permiso="'libro-de-ventas.documentos.eliminar'"
        variante="secundario"
        :icono="Trash2"
        @click="baja.eliminar"
      >
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <AvisosDelRegistro :avisos="avisosDelRegistro" @cerrar="avisosDelRegistro = []" />
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

    <SeccionDeFicha titulo="Datos del documento">
      <DatosDelRegistro :detalles="detallesDeEncabezado(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Totales"><TotalesDelDocumento :ficha="ficha" /></SeccionDeFicha>
    <SeccionDeFicha :titulo="`Líneas (${ficha.lineas.length})`"
      ><LineasDelDocumento :lineas="ficha.lineas"
    /></SeccionDeFicha>
    <SeccionDeFicha v-if="ficha.notas.length" titulo="Notas que la corrigen">
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
