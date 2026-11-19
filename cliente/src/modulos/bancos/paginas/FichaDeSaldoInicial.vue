<script setup lang="ts">
import { computed } from 'vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import EvidenciaDeLaApertura from '../componentes/saldos-iniciales/EvidenciaDeLaApertura.vue';
import GrupoDePartidas from '../componentes/saldos-iniciales/GrupoDePartidas.vue';
import PanelDeLaCuenta from '../componentes/saldos-iniciales/PanelDeLaCuenta.vue';
import VentanaDeAnulacionDePartida from '../componentes/saldos-iniciales/VentanaDeAnulacionDePartida.vue';
import VentanaDePartida from '../componentes/saldos-iniciales/VentanaDePartida.vue';
import VentanaDeSaldoInicial from '../componentes/saldos-iniciales/VentanaDeSaldoInicial.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import { usarFichaDeSaldoInicial } from '../composables/saldos-iniciales/usar-ficha-de-saldo-inicial';
import {
  ayudaDelGrupo,
  textoDeEliminarCabecera,
  textoDeEliminarPartida,
  textoDeNotasDelBancoPosteriores,
} from '../textos-de-apertura';

const props = defineProps<{ cuentaBancariaId: string }>();
const ficha = usarFichaDeSaldoInicial(props.cuentaBancariaId);
const {
  saldo,
  cabecera,
  partida,
  anulacion,
  eliminacionDelSaldo: bajaDelSaldo,
  eliminacionDePartida: bajaDePartida,
} = ficha;
const volver = { texto: 'Volver a Saldos iniciales', ruta: { name: 'bancos.saldos-iniciales' } };
const corte = computed(() => saldo.value?.fechaDeCorte ?? '');
const corteLegible = computed(() => (corte.value ? formatearFecha(corte.value) : ''));
const descripcion = computed(() => (corte.value ? `Saldo inicial al ${corteLegible.value}` : 'Saldo inicial'));
</script>

<template>
  <div v-if="saldo" class="space-y-4">
    <EncabezadoPagina :titulo="saldo.cuentaNombre" :descripcion="descripcion" :volver="volver" />
    <p v-if="!saldo.puedeEditar" class="rounded-lg bg-trigo-300/40 p-3 text-sm dark:bg-trigo-500/20" role="status">
      Solo lectura: la carga inicial está cerrada o la empresa no tiene fecha de inicio. Revise Empresas.
    </p>
    <PanelDeLaCuenta
      :saldo="saldo"
      @registrar="cabecera.abrir(null)"
      @corregir="cabecera.abrir(saldo)"
      @separar="cabecera.abrir(saldo)"
      @eliminar="bajaDelSaldo.abrir(saldo)"
    />
    <template v-if="saldo.forma === 'con_partidas'">
      <details class="rounded-lg bg-tierra-50 p-3 text-sm dark:bg-tierra-800/60">
        <summary class="cursor-pointer font-medium">¿Aparece una nota del banco después del corte?</summary>
        <p class="mt-2">{{ textoDeNotasDelBancoPosteriores(corteLegible) }}</p>
      </details>
      <GrupoDePartidas
        v-for="grupo in ficha.grupos.value"
        :key="grupo.parte"
        :grupo="grupo"
        :corte="corte"
        :ayuda="ayudaDelGrupo(grupo.parte, corteLegible)"
        :puede-agregar="saldo.puedeEditar"
        @agregar="partida.agregar(grupo.parte)"
        @corregir="partida.corregir"
        @eliminar="bajaDePartida.abrir"
        @anular="anulacion.abrir"
      />
    </template>
    <EvidenciaDeLaApertura v-if="saldo.forma !== 'sin_saldo'" :saldo="saldo" :control="ficha.evidencia" />

    <VentanaDeSaldoInicial
      v-model="cabecera.edicion.value"
      :errores="cabecera.errores.value"
      :enviando="cabecera.enviando.value"
      :corte="corteLegible"
      :nuevo="saldo.forma === 'sin_saldo'"
      @cerrar="cabecera.cerrar"
      @guardar="cabecera.guardar"
    />
    <VentanaDePartida
      v-model="partida.edicion.value"
      :errores="partida.errores.value"
      :enviando="partida.enviando.value"
      :corte="corte"
      :corte-legible="corteLegible"
      :opciones-de-concepto="partida.opcionesDeConcepto.value"
      @cerrar="partida.cerrar"
      @guardar="partida.guardar"
    />
    <VentanaDeAnulacionDePartida
      v-model:motivo="anulacion.motivo"
      v-model:fecha="anulacion.fecha"
      v-model:pagador="anulacion.pagador"
      :partida="anulacion.registro"
      :corte-legible="corteLegible"
      :errores="anulacion.errores"
      :enviando="anulacion.enviando"
      @cerrar="anulacion.cerrar"
      @confirmar="anulacion.confirmar"
    />
    <VentanaDeMotivo
      v-model:motivo="bajaDePartida.motivo"
      :abierta="!!bajaDePartida.registro"
      titulo="Eliminar partida"
      accion="Eliminar"
      :texto="textoDeEliminarPartida"
      :errores="bajaDePartida.errores"
      :enviando="bajaDePartida.enviando"
      @cerrar="bajaDePartida.cerrar"
      @confirmar="bajaDePartida.confirmar"
    />
    <VentanaDeMotivo
      v-model:motivo="bajaDelSaldo.motivo"
      :abierta="!!bajaDelSaldo.registro"
      titulo="Eliminar saldo inicial"
      accion="Eliminar"
      :texto="textoDeEliminarCabecera(saldo.partidas.length)"
      :errores="bajaDelSaldo.errores"
      :enviando="bajaDelSaldo.enviando"
      @cerrar="bajaDelSaldo.cerrar"
      @confirmar="bajaDelSaldo.confirmar"
    />
  </div>
  <p v-else-if="ficha.cargando.value" class="text-sm text-tierra-500">Cargando…</p>
</template>
