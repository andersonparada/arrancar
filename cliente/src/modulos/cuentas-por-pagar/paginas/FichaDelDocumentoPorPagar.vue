<script setup lang="ts">
import { useRouter } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AccionesDeLaFicha from '../componentes/AccionesDeLaFicha.vue';
import EnlacesDeLaFicha from '../componentes/EnlacesDeLaFicha.vue';
import AvisoDeLoPropio from '../componentes/AvisoDeLoPropio.vue';
import AccionesDeLaNota from '../componentes/AccionesDeLaNota.vue';
import NotasDelDocumento from '../componentes/NotasDelDocumento.vue';
import SeccionDeAjustes from '../componentes/SeccionDeAjustes.vue';
import SeccionDeAplicaciones from '../componentes/SeccionDeAplicaciones.vue';
import SeccionDeFicha from '../componentes/SeccionDeFicha.vue';
import VentanasDeLasAcciones from '../componentes/VentanasDeLasAcciones.vue';
import VentanasDeLaNota from '../componentes/VentanasDeLaNota.vue';
import {
  detallesDeAnulacion,
  detallesDeFicha,
  detallesDeMontos,
  detallesDeSeguimiento,
  textoDeEstado,
  tituloDeDocumento,
  tonoDeEstado,
} from '../composables/detalles-de-documento';
import { avisoDeLoPropio, esperaAOtraPersona } from '../composables/reglas-de-acciones';
import { usarAccionesDeNota } from '../composables/usar-acciones-de-nota';
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
const nota = usarAccionesDeNota(ficha, cargar);
const volver = { texto: VENTANAS_CUENTAS_POR_PAGAR.documentos.titulo, ruta: { name: 'cuentas-por-pagar.documentos' } };
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="tituloDeDocumento(ficha)" :descripcion="ficha.proveedorNombre" :volver="volver">
      <InsigniaBase class="self-center" :tono="tonoDeEstado(ficha.estado)">{{
        textoDeEstado(ficha.estado)
      }}</InsigniaBase>
      <InsigniaBase v-if="ficha.vencido" class="self-center" tono="rojo">Vencido</InsigniaBase>
      <AccionesDeLaNota
        :ficha="ficha"
        :abriendo="nota.aplicacion.abriendo.value"
        @aplicar="nota.aplicacion.abrir"
        @ajustar="nota.ajuste.abrir"
      />
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
    <SeccionDeFicha v-if="ficha.anulacion" titulo="Anulación">
      <DatosDelRegistro :detalles="detallesDeAnulacion(ficha)" />
    </SeccionDeFicha>
    <NotasDelDocumento :ficha="ficha" />
    <SeccionDeAplicaciones :ficha="ficha" @quitar="nota.quitar.abrir" />
    <SeccionDeAjustes :ajustes="ficha.ajustes" @anular="nota.anularAjuste.abrir" />
    <EnlacesDeLaFicha :ficha="ficha" />

    <VentanasDeLaNota :ficha="ficha" :acciones="nota" />
    <VentanasDeLasAcciones :ficha="ficha" :acciones="acciones" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
</template>
