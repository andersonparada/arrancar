<script setup lang="ts">
import { CircleCheckBig } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import BarraDeClasificacion from '../componentes/sin-clasificar/BarraDeClasificacion.vue';
import TarjetaDePendiente from '../componentes/sin-clasificar/TarjetaDePendiente.vue';
import VentanaDeAceptarSugerencias from '../componentes/sin-clasificar/VentanaDeAceptarSugerencias.vue';
import FiltrosDeMovimientos from '../componentes/movimientos/FiltrosDeMovimientos.vue';
import { usarReferenciasDeCuenta } from '../composables/cuentas-bancarias/referencias-de-cuenta';
import { usarBandejaDeSinClasificar } from '../composables/movimientos/usar-bandeja-de-sin-clasificar';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.sinClasificar;
const { filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeCuenta();
const bandeja = usarBandejaDeSinClasificar();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" />

    <FiltrosDeMovimientos v-model="bandeja.filtros" :opciones-de-cuenta="opcionesDeCuenta" />

    <p v-if="bandeja.sugerencias.truncado.value" class="mb-3 text-sm text-amber-700 dark:text-amber-400" role="status">
      Hay más de 2,000 movimientos sin clasificar y solo se calcularon sugerencias para los primeros. Acote las fechas o
      la cuenta para ver las demás.
    </p>
    <p v-if="bandeja.cargando.value" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!bandeja.filas.value.length"
      :icono="CircleCheckBig"
      titulo="No hay nada sin clasificar"
      descripcion="Todas las notas y cheques de este filtro ya tienen su concepto."
    />
    <template v-else>
      <div v-permiso="'bancos.notas.editar'" class="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
            :checked="bandeja.todosMarcados.value"
            @change="bandeja.alternarTodos"
          />
          Marcar todo lo que se ve
        </label>
        <CampoInterruptor
          v-model="bandeja.sugerencias.soloConSugerencia.value"
          etiqueta="Solo con sugerencia"
          class="gap-3"
        />
      </div>
      <ul class="grid gap-3 md:grid-cols-2">
        <li v-for="fila in bandeja.filas.value" :key="fila.id">
          <TarjetaDePendiente
            :fila="fila"
            :marcada="bandeja.seleccion.value.has(fila.id)"
            :sugerencia="bandeja.sugerencias.porMovimiento.value.get(fila.id) ?? null"
            :enviando="bandeja.aceptacion.enviando.value"
            @alternar="bandeja.alternar(fila.id)"
            @usar="bandeja.usar(fila.id, $event.conceptoId, $event.conceptoNombre)"
          />
        </li>
      </ul>
      <BarraDeClasificacion
        v-model:concepto="bandeja.conceptoElegido.value"
        :resumen="bandeja.resumen.value"
        :opciones="bandeja.opciones.value"
        :puede-clasificar="bandeja.puedeClasificar.value"
        :cantidad-sugerida="bandeja.cantidadSugerida.value"
        @clasificar="bandeja.clasificar"
        @aceptar-sugerido="bandeja.aceptarLoSugerido"
      />
      <VentanaDeAceptarSugerencias
        v-model:confirmado="bandeja.aceptacion.confirmado.value"
        :lote="bandeja.aceptacion.lote.value"
        :enviando="bandeja.aceptacion.enviando.value"
        @cerrar="bandeja.aceptacion.cerrarLote"
        @confirmar="bandeja.aceptacion.confirmarLote"
      />
    </template>
  </div>
</template>
