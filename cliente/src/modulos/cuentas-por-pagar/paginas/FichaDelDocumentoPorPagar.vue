<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import { RouterLink, useRouter } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AccionesDeLaFicha from '../componentes/AccionesDeLaFicha.vue';
import AvisoDeLoPropio from '../componentes/AvisoDeLoPropio.vue';
import NotasYAplicaciones from '../componentes/NotasYAplicaciones.vue';
import SeccionDeFicha from '../componentes/SeccionDeFicha.vue';
import VentanaDeAnulacion from '../componentes/VentanaDeAnulacion.vue';
import VentanaDeDesautorizacion from '../componentes/VentanaDeDesautorizacion.vue';
import VentanaDeVencimiento from '../componentes/VentanaDeVencimiento.vue';
import {
  detallesDeFicha,
  detallesDeMontos,
  detallesDeSeguimiento,
  textoDeEstado,
  tituloDeDocumento,
  tonoDeEstado,
} from '../composables/detalles-de-documento';
import {
  avisoDeLoPropio,
  esperaAOtraPersona,
  mensajeDeDesautorizacion,
  resumenDeAnulacion,
} from '../composables/reglas-de-acciones';
import { usarAccionesDelDocumento } from '../composables/usar-acciones-del-documento';
import { usarFichaDelDocumento } from '../composables/usar-ficha-del-documento';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** La ficha de un documento por pagar: sus datos, montos, notas y aplicaciones, y las acciones que se pueden hacer. */
const props = defineProps<{ documentoId: string }>();
const router = useRouter();
const { datos: ficha, cargando, cargar } = usarFichaDelDocumento(() => props.documentoId);
const acciones = usarAccionesDelDocumento(ficha, cargar, () =>
  router.replace({ name: 'cuentas-por-pagar.documentos' }),
);
const volver = { texto: VENTANAS_CUENTAS_POR_PAGAR.documentos.titulo, ruta: { name: 'cuentas-por-pagar.documentos' } };
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="tituloDeDocumento(ficha)" :descripcion="ficha.proveedorNombre" :volver="volver">
      <InsigniaBase class="self-center" :tono="tonoDeEstado(ficha.estado)">{{
        textoDeEstado(ficha.estado)
      }}</InsigniaBase>
      <InsigniaBase v-if="ficha.vencido" class="self-center" tono="rojo">Vencido</InsigniaBase>
      <AccionesDeLaFicha
        :ficha="ficha"
        :puede-autorizar-propios="acciones.puedeAutorizarPropios"
        :autorizando="acciones.autorizacion.enviando.value"
        @autorizar="acciones.autorizar"
        @desautorizar="acciones.desautorizacion.abrir"
        @cambiar-vencimiento="acciones.vencimiento.abrir"
        @anular="acciones.anulacion.abrir"
        @eliminar="acciones.eliminacion.eliminar"
      />
    </EncabezadoPagina>

    <AvisoDeLoPropio
      :mensaje="acciones.autorizacion.avisoDeLoPropio.value"
      @cerrar="acciones.autorizacion.cerrarAviso"
    />
    <p
      v-if="esperaAOtraPersona(ficha, acciones.puedeAutorizarPropios)"
      class="text-sm text-trigo-700 dark:text-trigo-300"
    >
      {{ avisoDeLoPropio }}
    </p>

    <SeccionDeFicha titulo="Datos del documento"
      ><DatosDelRegistro :detalles="detallesDeFicha(ficha)"
    /></SeccionDeFicha>
    <SeccionDeFicha titulo="Montos"><DatosDelRegistro :detalles="detallesDeMontos(ficha)" /></SeccionDeFicha>
    <SeccionDeFicha v-if="detallesDeSeguimiento(ficha).length" titulo="Seguimiento">
      <DatosDelRegistro :detalles="detallesDeSeguimiento(ficha)" />
    </SeccionDeFicha>
    <NotasYAplicaciones :ficha="ficha" />
    <RouterLink
      v-permiso="'libro-de-compras.documentos.ver'"
      :to="{ name: 'libro-de-compras.documentos.ficha', params: { documentoId: ficha.documentoId } }"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-campo-700 underline dark:text-campo-300"
    >
      <ExternalLink class="size-4" aria-hidden="true" />
      Ver el registro en el libro de compras
    </RouterLink>

    <VentanaDeDesautorizacion
      v-model="acciones.desautorizacion.edicion.value"
      :resumen="mensajeDeDesautorizacion(ficha)"
      :errores="acciones.desautorizacion.errores.value"
      :enviando="acciones.desautorizacion.enviando.value"
      @cerrar="acciones.desautorizacion.cerrar"
      @guardar="acciones.desautorizacion.desautorizar"
    />
    <VentanaDeVencimiento
      v-model="acciones.vencimiento.edicion.value"
      :errores="acciones.vencimiento.errores.value"
      :enviando="acciones.vencimiento.enviando.value"
      @cerrar="acciones.vencimiento.cerrar"
      @guardar="acciones.vencimiento.cambiar"
    />
    <VentanaDeAnulacion
      v-model="acciones.anulacion.edicion.value"
      :resumen="resumenDeAnulacion(ficha)"
      :errores="acciones.anulacion.errores.value"
      :enviando="acciones.anulacion.enviando.value"
      @cerrar="acciones.anulacion.cerrar"
      @guardar="acciones.anulacion.anular"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
</template>
