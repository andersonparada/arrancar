<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { compararSaldo, normalizarMonto } from '../../composables/conciliaciones/comparacion-de-saldo';
import type { Conciliacion } from '../../servicios/conciliaciones.api';

/** El saldo final del estado de cuenta del banco, transcrito por el usuario y comparado en vivo con el calculado. */
const props = defineProps<{ conciliacion: Conciliacion; guardando?: boolean; error?: string }>();
const emit = defineEmits<{ guardar: [saldo: string | null] }>();

const sesion = usarSesion();
const texto = ref(props.conciliacion.saldoEstadoDeCuenta ?? '');
const formatoInvalido = ref(false);
watch(
  () => props.conciliacion.saldoEstadoDeCuenta,
  (saldo) => (texto.value = saldo ?? ''),
);

const editable = computed(
  () =>
    props.conciliacion.estado === 'en_proceso' &&
    !props.conciliacion.previaAlSaldoTranscrito &&
    sesion.puede('bancos.conciliaciones.conciliar'),
);
const comparacion = computed(() =>
  compararSaldo(
    editable.value ? texto.value : props.conciliacion.saldoEstadoDeCuenta,
    props.conciliacion.saldoQueDebeMostrarElEstadoDeCuenta,
  ),
);
const errorVisible = computed(
  () => props.error ?? (formatoInvalido.value ? 'Escriba el saldo como 1250.50 (hasta 2 decimales).' : undefined),
);

/** Guarda si el texto es un importe válido (o vacío, que borra) y cambió respecto de lo guardado. */
function guardar(): void {
  const vacio = texto.value.trim() === '';
  const monto = vacio ? null : normalizarMonto(texto.value);
  formatoInvalido.value = !vacio && monto === null;
  if (formatoInvalido.value || monto === props.conciliacion.saldoEstadoDeCuenta) return;
  emit('guardar', monto);
}
</script>

<template>
  <TarjetaBase class="space-y-3">
    <h3 class="text-base font-semibold">Saldo del estado de cuenta del banco</h3>
    <p v-if="conciliacion.previaAlSaldoTranscrito" class="text-sm text-tierra-600 dark:text-tierra-300">
      Esta conciliación se elaboró antes de que se pidiera transcribir el saldo del estado de cuenta, por eso no lo
      tiene. No se puede autorizar así: devuélvala para que quien la elaboró escriba el saldo.
    </p>
    <template v-else>
      <form v-if="editable" class="flex flex-wrap items-end gap-2 print:hidden" @submit.prevent="guardar">
        <div class="min-w-0 flex-1 basis-48">
          <CampoTexto
            v-model="texto"
            etiqueta="Saldo final que muestra el banco (Q)"
            sin-correccion
            :error="errorVisible"
            ayuda="Cópielo tal como aparece en el estado de cuenta. Se guarda al salir del campo."
            @focusout="guardar"
          />
        </div>
        <BotonBase tipo="submit" variante="secundario" :cargando="guardando">Guardar</BotonBase>
      </form>
      <p
        v-if="conciliacion.saldoEstadoDeCuenta !== null"
        :class="{ 'hidden print:block': editable }"
        class="text-2xl font-bold"
      >
        {{ formatearMonto(conciliacion.saldoEstadoDeCuenta) }}
      </p>
      <p v-else-if="!editable" class="text-sm text-tierra-500">No se transcribió el saldo.</p>
      <p
        v-if="comparacion.estado === 'coincide'"
        role="status"
        class="text-sm font-medium text-campo-700 dark:text-campo-400"
      >
        Coincide con el saldo calculado.
      </p>
      <p
        v-else-if="comparacion.estado === 'difiere'"
        role="status"
        class="text-sm font-medium text-red-700 dark:text-red-400"
      >
        Difiere en {{ formatearMonto(comparacion.diferencia) }} del saldo calculado: revise las marcas o registre la
        nota que falte.
      </p>
    </template>
  </TarjetaBase>
</template>
