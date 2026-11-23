<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import FichaNoEncontrada from '@/modulos/core/componentes/FichaNoEncontrada.vue';
import VentanaDeMotivo from '../componentes/comunes/VentanaDeMotivo.vue';
import HojaDeBoleta from '../componentes/traslados/HojaDeBoleta.vue';
import { usarBoleta } from '../composables/traslados/usar-boleta';

const props = defineProps<{ grupoId: string }>();

const { boleta, cargando, numero, anulacion, imprimir } = usarBoleta(props.grupoId);
const volver = { texto: 'Volver a Activos fijos', ruta: { name: 'activos-fijos.activos' } };
</script>

<template>
  <div v-if="boleta" class="space-y-4">
    <EncabezadoPagina
      :titulo="`Boleta de traslado ${numero}`"
      descripcion="Imprímala, fírmenla quien entrega y quien recibe, y guárdela con el expediente."
      :volver="volver"
      class="print:hidden"
    >
      <BotonBase :icono="Printer" @click="imprimir">Imprimir</BotonBase>
      <BotonBase
        v-if="boleta.estado === 'vigente'"
        v-permiso="'activos-fijos.traslados.anular'"
        variante="secundario"
        @click="anulacion.pedir(boleta)"
      >
        Anular boleta
      </BotonBase>
    </EncabezadoPagina>
    <HojaDeBoleta :boleta="boleta" :numero="numero" />
    <VentanaDeMotivo
      v-model:motivo="anulacion.motivo.value"
      :abierta="anulacion.boleta.value !== null"
      titulo="Anular boleta"
      :texto="anulacion.texto.value"
      accion="Anular boleta"
      :errores="anulacion.errores.value"
      :enviando="anulacion.enviando.value"
      @cerrar="anulacion.cerrar"
      @confirmar="anulacion.confirmar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
  <FichaNoEncontrada v-else titulo="Boleta" :volver="volver" />
</template>
