<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import ListaDeMovimientosConciliables from '../componentes/conciliaciones/ListaDeMovimientosConciliables.vue';
import ResumenDeConciliacion from '../componentes/conciliaciones/ResumenDeConciliacion.vue';
import { calcularResumen } from '../composables/conciliaciones/calculo-de-conciliacion';
import { periodoDeConciliacion } from '../composables/conciliaciones/detalles-de-conciliacion';
import { usarGuardadoDeConciliacion } from '../composables/conciliaciones/usar-guardado-de-conciliacion';
import { usarMarcadoDeMovimientos } from '../composables/conciliaciones/usar-marcado-de-movimientos';
import { apiConciliaciones, type Conciliacion } from '../servicios/conciliaciones.api';

const props = defineProps<{ conciliacionId: string }>();
const { datos: conciliacion, cargando } = usarCarga(
  () => apiConciliaciones.obtener(props.conciliacionId),
  null as Conciliacion | null,
  'No se pudo cargar la conciliación.',
);
const { marcados, movimientosConMarca, alternar } = usarMarcadoDeMovimientos(conciliacion);
const { guardando, errores, guardarMarcas, guardarSaldo, cerrar } = usarGuardadoDeConciliacion(conciliacion);

const saldoSegunBanco = ref('');
watch(conciliacion, (actual) => actual && (saldoSegunBanco.value = actual.saldoSegunBanco), { immediate: true });

const resumen = computed(() =>
  conciliacion.value
    ? calcularResumen(conciliacion.value.saldoAnterior, saldoSegunBanco.value, movimientosConMarca.value)
    : { saldoConciliado: '0.00', diferencia: '0.00' },
);

async function cerrarConciliacion(): Promise<void> {
  if ((await guardarMarcas(marcados.value)) && (await guardarSaldo(saldoSegunBanco.value))) await cerrar();
}

const volver = { texto: 'Volver a conciliaciones', ruta: { name: 'bancos.conciliaciones' } };
</script>

<template>
  <div class="space-y-4">
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <template v-else-if="conciliacion">
      <EncabezadoPagina
        :titulo="`Conciliar ${periodoDeConciliacion(conciliacion)}`"
        :descripcion="`${conciliacion.cuentaBancariaNombre ?? ''} · Saldo según banco: ${formatearMonto(conciliacion.saldoSegunBanco)}`"
        :volver="volver"
      />
      <ResumenDeConciliacion
        v-model:saldo-segun-banco="saldoSegunBanco"
        :saldo-anterior="conciliacion.saldoAnterior"
        :resumen="resumen"
        :cerrada="conciliacion.cerrada"
        :guardando="guardando"
        :errores="errores"
        @guardar-saldo="guardarSaldo(saldoSegunBanco)"
        @cerrar="cerrarConciliacion"
      />
      <div v-if="!conciliacion.cerrada" class="flex justify-end">
        <button
          type="button"
          class="text-sm font-medium text-campo-700 hover:underline dark:text-campo-400"
          @click="guardarMarcas(marcados)"
        >
          Guardar marcas
        </button>
      </div>
      <ListaDeMovimientosConciliables
        :movimientos="movimientosConMarca"
        :cerrada="conciliacion.cerrada"
        @alternar="alternar"
      />
    </template>
  </div>
</template>
