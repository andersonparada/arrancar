<script setup lang="ts">
import { CircleCheckBig } from 'lucide-vue-next';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import BarraDeClasificacion from '../componentes/sin-clasificar/BarraDeClasificacion.vue';
import TarjetaDePendiente from '../componentes/sin-clasificar/TarjetaDePendiente.vue';
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

    <p v-if="bandeja.cargando.value" class="text-sm text-tierra-500">Cargando…</p>
    <EstadoVacio
      v-else-if="!bandeja.filas.value.length"
      :icono="CircleCheckBig"
      titulo="No hay nada sin clasificar"
      descripcion="Todas las notas y cheques de este filtro ya tienen su concepto."
    />
    <template v-else>
      <label v-permiso="'bancos.notas.editar'" class="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="size-5 rounded border-tierra-300 text-campo-600 focus:ring-campo-500"
          :checked="bandeja.todosMarcados.value"
          @change="bandeja.alternarTodos"
        />
        Marcar todo lo que se ve
      </label>
      <ul class="grid gap-3 md:grid-cols-2">
        <li v-for="fila in bandeja.filas.value" :key="fila.id">
          <TarjetaDePendiente
            :fila="fila"
            :marcada="bandeja.seleccion.value.has(fila.id)"
            @alternar="bandeja.alternar(fila.id)"
          />
        </li>
      </ul>
      <BarraDeClasificacion
        v-model:concepto="bandeja.conceptoElegido.value"
        :resumen="bandeja.resumen.value"
        :opciones="bandeja.opciones.value"
        :puede-clasificar="bandeja.puedeClasificar.value"
        @clasificar="bandeja.clasificar"
      />
    </template>
  </div>
</template>
