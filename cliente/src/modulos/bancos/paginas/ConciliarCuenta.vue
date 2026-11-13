<script setup lang="ts">
import { computed } from 'vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import AccionesDeConciliacion from '../componentes/conciliaciones/AccionesDeConciliacion.vue';
import CuadroCuadratico from '../componentes/conciliaciones/CuadroCuadratico.vue';
import EncabezadoDeConciliacion from '../componentes/conciliaciones/EncabezadoDeConciliacion.vue';
import ListaDeMovimientosConciliables from '../componentes/conciliaciones/ListaDeMovimientosConciliables.vue';
import PartidasDeConciliacion from '../componentes/conciliaciones/PartidasDeConciliacion.vue';
import SaldoDelEstadoDeCuenta from '../componentes/conciliaciones/SaldoDelEstadoDeCuenta.vue';
import SaldoTranscrito from '../componentes/conciliaciones/SaldoTranscrito.vue';
import VentanaDeDevolucion from '../componentes/conciliaciones/VentanaDeDevolucion.vue';
import { periodoDeConciliacion } from '../composables/conciliaciones/detalles-de-conciliacion';
import { usarDevolucionDeConciliacion } from '../composables/conciliaciones/usar-devolucion-de-conciliacion';
import { usarGuardadoDeConciliacion } from '../composables/conciliaciones/usar-guardado-de-conciliacion';
import { usarMarcadoDeMovimientos } from '../composables/conciliaciones/usar-marcado-de-movimientos';
import { apiConciliaciones, type Conciliacion } from '../servicios/conciliaciones.api';

const props = defineProps<{ conciliacionId: string }>();
const { datos: conciliacion, cargando } = usarCarga(
  () => apiConciliaciones.obtener(props.conciliacionId),
  null as Conciliacion | null,
  'No se pudo cargar la conciliación.',
);
const { marcados, candidatosConMarca, alternar } = usarMarcadoDeMovimientos(conciliacion);
const {
  guardando,
  errores: erroresDelGuardado,
  guardarMarcas,
  guardarSaldo,
  terminar,
  autorizar,
} = usarGuardadoDeConciliacion(conciliacion);
const {
  abierta: devolucionAbierta,
  motivo: devolucionMotivo,
  enviando: devolviendo,
  errores: erroresDeDevolucion,
  abrir: abrirDevolucion,
  cerrar: cerrarDevolucion,
  confirmar: confirmarDevolucion,
} = usarDevolucionDeConciliacion(conciliacion);

const enProceso = computed(() => conciliacion.value?.estado === 'en_proceso');
const volver = { texto: 'Volver a conciliaciones', ruta: { name: 'bancos.conciliaciones' } };
const imprimir = (): void => window.print();
</script>

<template>
  <div class="space-y-4">
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <template v-else-if="conciliacion">
      <EncabezadoPagina
        :titulo="`Conciliar ${periodoDeConciliacion(conciliacion)}`"
        :volver="volver"
        class="print:hidden"
      >
        <BotonBase variante="secundario" @click="imprimir">Imprimir</BotonBase>
      </EncabezadoPagina>

      <EncabezadoDeConciliacion :conciliacion="conciliacion" />
      <CuadroCuadratico :libros="conciliacion.cuadratica.libros" :banco="conciliacion.cuadratica.banco" />
      <SaldoDelEstadoDeCuenta :saldo="conciliacion.saldoQueDebeMostrarElEstadoDeCuenta" />
      <SaldoTranscrito
        :conciliacion="conciliacion"
        :guardando="guardando"
        :error="erroresDelGuardado.saldoEstadoDeCuenta"
        @guardar="guardarSaldo"
      />
      <PartidasDeConciliacion :partidas="conciliacion.partidas" />

      <div v-if="enProceso" v-permiso="'bancos.conciliaciones.conciliar'" class="flex justify-end print:hidden">
        <button
          type="button"
          class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
          @click="guardarMarcas(marcados)"
        >
          Guardar marcas
        </button>
      </div>
      <ListaDeMovimientosConciliables :movimientos="candidatosConMarca" :editable="enProceso" @alternar="alternar" />

      <AccionesDeConciliacion
        :conciliacion="conciliacion"
        :guardando="guardando"
        @terminar="terminar"
        @devolver="abrirDevolucion"
        @autorizar="autorizar"
      />
    </template>

    <VentanaDeDevolucion
      v-model:motivo="devolucionMotivo"
      :abierta="devolucionAbierta"
      :enviando="devolviendo"
      :errores="erroresDeDevolucion"
      @cerrar="cerrarDevolucion"
      @devolver="confirmarDevolucion"
    />
  </div>
</template>
