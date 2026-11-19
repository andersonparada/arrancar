<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import {
  MAXIMO_DE_LA_DESCRIPCION_DEL_GASTO,
  MAXIMO_DE_PAGADO_A,
  MAXIMO_DEL_MOTIVO_DEL_GASTO,
} from '../composables/gastos/gastos-del-anticipo';
import type { EdicionDeLaVentanaDeGasto } from '../composables/gastos/usar-gasto-sin-documento';
import { fechaDeHoy } from '../composables/reportes/fechas-de-reportes';

/**
 * Un gasto que no tiene factura (un taxi, una propina): se anota qué fue, a quién se pagó, el concepto y por qué no hay
 * documento. Si hay factura, es mejor «Agregar factura»: así el gasto es deducible.
 */
defineProps<{
  conceptos: OpcionBuscable<string>[];
  cargando: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeLaVentanaDeGasto>({ required: true });
const hoy = fechaDeHoy();
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Gasto sin documento" @cerrar="emit('cerrar')">
    <form id="form-gasto-sin-documento" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.monto"
          etiqueta="Monto"
          tipo="number"
          paso="0.01"
          requerido
          :error="errores.monto"
        />
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha del gasto"
          tipo="date"
          :maximo="hoy"
          requerido
          :error="errores.fecha"
        />
      </div>
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Qué se compró o se pagó"
        requerido
        :longitud-maxima="MAXIMO_DE_LA_DESCRIPCION_DEL_GASTO"
        :error="errores.descripcion"
      />
      <CampoTexto
        v-model="edicion.pagadoA"
        etiqueta="A quién se le pagó"
        requerido
        :longitud-maxima="MAXIMO_DE_PAGADO_A"
        :error="errores.pagadoA"
      />
      <CampoSelector
        v-model="edicion.conceptoDeGastoId"
        etiqueta="Concepto de gasto"
        requerido
        :opciones="conceptos"
        :error="errores.conceptoDeGastoId"
      />
      <p v-if="!cargando && conceptos.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
        No hay conceptos de gasto activos. Créelos en
        <RouterLink to="/libro-de-compras/conceptos-de-gasto" class="font-medium underline underline-offset-2">
          Libro de compras
        </RouterLink>
        para poder registrar el gasto.
      </p>
      <CampoTexto
        v-model="edicion.motivoSinDocumento"
        etiqueta="Por qué no hay documento"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO_DEL_GASTO"
        ayuda="Por ejemplo: «el taxista no dio factura». Queda anotado en el gasto."
        :error="errores.motivoSinDocumento"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-gasto-sin-documento" :cargando="enviando">Registrar el gasto</BotonBase>
    </template>
  </VentanaModal>
</template>
