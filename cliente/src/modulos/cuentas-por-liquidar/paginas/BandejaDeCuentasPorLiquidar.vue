<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import FiltrosDeBandeja from '../componentes/FiltrosDeBandeja.vue';
import TarjetaDeDocumentoDeBandeja from '../componentes/TarjetaDeDocumentoDeBandeja.vue';
import VentanaDeAsignacion from '../componentes/VentanaDeAsignacion.vue';
import { totalDeLoMarcado } from '../composables/bandeja/bandeja';
import { usarBandeja } from '../composables/bandeja/usar-bandeja';
import { VENTANAS_CUENTAS_POR_LIQUIDAR } from '../textos';

/** Los documentos del libro de compras que llegaron sin anticipo: se marcan y se asignan a uno abierto, en una sola tanda. */
const ventana = VENTANAS_CUENTAS_POR_LIQUIDAR.bandeja;
const b = usarBandeja();
const volver = {
  texto: VENTANAS_CUENTAS_POR_LIQUIDAR.anticipos.titulo,
  ruta: { name: 'cuentas-por-liquidar.anticipos' },
};
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" :volver="volver">
      <BotonBase v-if="b.asignables.value.length > 0" variante="secundario" @click="b.marcarTodos">
        {{ b.todosMarcados.value ? 'Desmarcar todos' : 'Marcar todos' }}
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDeBandeja v-model="b.filtros" @quitar="b.quitarFiltros" />

    <p v-if="b.cargando.value && b.gastos.value.length === 0" class="text-sm text-tierra-500" role="status">
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="b.gastos.value.length === 0"
      :icono="Inbox"
      titulo="La bandeja está vacía"
      descripcion="Aquí llegan las facturas que se registraron para Cuentas por liquidar sin decir de cuál anticipo. Si no hay nada, todo está asignado."
    >
      <BotonBase
        v-if="b.filtros.desde || b.filtros.hasta || b.filtros.soloConRetencion"
        variante="secundario"
        @click="b.quitarFiltros"
      >
        Quitar filtros
      </BotonBase>
    </EstadoVacio>
    <ul
      v-else
      class="grid grid-cols-1 gap-3 transition-opacity lg:grid-cols-2"
      :class="{ 'opacity-60': b.cargando.value }"
      :aria-busy="b.cargando.value"
    >
      <li v-for="gasto in b.gastos.value" :key="gasto.id">
        <TarjetaDeDocumentoDeBandeja
          :gasto="gasto"
          :marcado="b.marcados.value.has(gasto.id)"
          @alternar="b.alternar(gasto.id)"
        />
      </li>
    </ul>

    <div
      v-if="b.seleccion.value.length > 0"
      v-permiso="'cuentas-por-liquidar.gastos.crear'"
      class="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-tierra-200 bg-white/95 p-3 backdrop-blur sm:mx-0 sm:rounded-xl dark:border-tierra-700 dark:bg-tierra-900/95"
      role="region"
      aria-label="Documentos marcados"
    >
      <p class="text-sm" aria-live="polite">
        <strong>{{ b.seleccion.value.length }}</strong> marcados por
        <strong>{{ formatearMonto(totalDeLoMarcado(b.seleccion.value)) }}</strong>
      </p>
      <BotonBase @click="b.asignacion.abrir">Asignar a un anticipo…</BotonBase>
    </div>

    <VentanaDeAsignacion
      v-model="b.asignacion.edicion.value"
      :seleccion="b.seleccion.value"
      :anticipos="b.asignacion.opciones.value"
      :con-retencion="b.asignacion.conRetencion.value"
      :errores="b.asignacion.errores.value"
      :enviando="b.asignacion.enviando.value"
      @cerrar="b.asignacion.cerrar"
      @guardar="b.asignacion.confirmar"
    />
  </div>
</template>
