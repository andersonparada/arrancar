<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { usarSaldoInicial } from '../../composables/cuentas-bancarias/usar-saldo-inicial';
import VentanaDeAnulacion from '../VentanaDeAnulacion.vue';
import VentanaDeSaldoInicial from './VentanaDeSaldoInicial.vue';

/** La sección del saldo inicial en la ficha de la cuenta bancaria: verlo, registrarlo, corregirlo y anularlo. */
const props = defineProps<{ cuentaBancariaId: string }>();
const { saldoInicial, cargando, formulario, anulacion } = usarSaldoInicial(props.cuentaBancariaId);
</script>

<template>
  <div class="space-y-3">
    <h2 class="text-sm font-semibold text-tierra-700 dark:text-tierra-200">Saldo inicial</h2>
    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else-if="saldoInicial" class="flex flex-wrap items-center justify-between gap-3">
      <dl class="grid grid-cols-3 gap-x-4 text-sm">
        <div>
          <dt class="text-xs text-tierra-500">Fecha</dt>
          <dd>{{ formatearFecha(saldoInicial.fecha) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Tipo</dt>
          <dd>{{ saldoInicial.tipo === 'credito' ? 'Crédito' : 'Débito' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-tierra-500">Monto</dt>
          <dd>{{ formatearMonto(saldoInicial.monto) }}</dd>
        </div>
      </dl>
      <div class="flex gap-2">
        <BotonBase
          v-permiso="'bancos.saldos-iniciales.gestionar'"
          variante="secundario"
          pequeno
          @click="formulario.corregir(saldoInicial)"
        >
          Corregir
        </BotonBase>
        <BotonBase
          v-permiso="'bancos.saldos-iniciales.gestionar'"
          variante="fantasma"
          pequeno
          @click="anulacion.abrir(saldoInicial)"
        >
          Anular
        </BotonBase>
      </div>
    </TarjetaBase>
    <TarjetaBase v-else class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-tierra-500">Esta cuenta todavía no tiene saldo inicial.</p>
      <BotonBase v-permiso="'bancos.saldos-iniciales.gestionar'" variante="secundario" @click="formulario.registrar">
        Registrar saldo inicial
      </BotonBase>
    </TarjetaBase>

    <VentanaDeSaldoInicial
      v-model="formulario.edicion.value"
      :errores="formulario.errores.value"
      :enviando="formulario.enviando.value"
      @cerrar="formulario.edicion.value.abierta = false"
      @guardar="formulario.guardar"
    />
    <VentanaDeAnulacion
      v-model:motivo="anulacion.motivo.value"
      :abierta="!!anulacion.registro.value"
      titulo="Anular saldo inicial"
      texto="¿Anular el saldo inicial de esta cuenta? Esta acción no se puede deshacer."
      :errores="anulacion.errores.value"
      :enviando="anulacion.enviando.value"
      @cerrar="anulacion.cerrar"
      @anular="anulacion.confirmar"
    />
  </div>
</template>
