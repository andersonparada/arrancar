<script setup lang="ts">
import { computed } from 'vue';
import { LockKeyhole, LockKeyholeOpen } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import {
  AYUDA_DE_FECHA_DE_INICIO,
  avisoDeErrorEnSecciones,
  avisoDeFechaDeInicio,
} from '../composables/datos-de-empresa';
import type { CargaInicialEnEdicion } from '../composables/usar-carga-inicial';
import BalanceDeApertura from './BalanceDeApertura.vue';
import ResumenDelCierre from './ResumenDelCierre.vue';

const props = defineProps<{
  estado: CargaInicialEnEdicion;
  errores: Record<string, string>;
  /** Hay fecha guardada y sin cambios pendientes en el campo. */
  puedeCerrar: boolean;
}>();
const fechaDeInicio = defineModel<string>('fechaDeInicio', { required: true });

const carga = computed(() => props.estado.carga);
const cerrada = computed(() => carga.value?.cerrada ?? false);
const avisoDeFecha = computed(() => (cerrada.value ? null : avisoDeFechaDeInicio(fechaDeInicio.value)));
const errorDeSecciones = computed(() => avisoDeErrorEnSecciones(props.errores));
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 flex items-center gap-2 text-sm font-semibold text-tierra-800 dark:text-tierra-100">
      Fecha de inicio y carga inicial
      <InsigniaBase v-if="carga" :tono="cerrada ? 'campo' : 'trigo'">{{
        cerrada ? 'Cerrada' : 'Abierta'
      }}</InsigniaBase>
    </legend>
    <CampoTexto
      v-model="fechaDeInicio"
      etiqueta="Fecha de inicio"
      tipo="date"
      :solo-lectura="cerrada"
      :error="errores.fechaDeInicio"
      :ayuda="
        cerrada
          ? `Fija desde el ${formatearFecha(carga?.fechaDeInicio)}. Para cambiarla, reabra la carga.`
          : AYUDA_DE_FECHA_DE_INICIO
      "
    />
    <p
      v-if="avisoDeFecha"
      role="status"
      class="rounded-lg bg-trigo-300/40 px-3 py-2 text-xs text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
    >
      {{ avisoDeFecha }}
    </p>
    <p v-if="errorDeSecciones" role="alert" class="text-xs text-red-700 dark:text-red-400">
      {{ errorDeSecciones }}
    </p>
    <ResumenDelCierre
      v-if="carga"
      :carga="carga"
      :exportando="estado.guardados.exportando"
      @ver-revision="estado.guardados.verUltimaRevision()"
      @exportar="estado.guardados.exportarUltimo()"
      @ver-historial="estado.guardados.abrirHistorial()"
    />
    <BalanceDeApertura
      v-if="carga"
      :balance="carga.balanceDeApertura"
      :acciones="estado.balance.acciones"
      :enviando="estado.balance.enviando"
      :error="estado.balance.error"
      :direccion="estado.balance.direccion"
      :visor-abierto="estado.balance.visorAbierto"
      @subir="estado.balance.subir($event)"
      @quitar="estado.balance.quitar()"
      @ver="estado.balance.abrirVisor()"
      @cerrar-visor="estado.balance.cerrarVisor()"
    />
    <div class="flex flex-wrap gap-2">
      <BotonBase
        v-if="!cerrada"
        v-permiso="'empresas.carga-inicial.cerrar'"
        variante="secundario"
        pequeno
        :icono="LockKeyhole"
        :deshabilitado="!puedeCerrar"
        :cargando="estado.cierre.cargandoRevision"
        @click="estado.cierre.abrir()"
      >
        Cerrar carga inicial
      </BotonBase>
      <BotonBase
        v-else
        v-permiso="'empresas.carga-inicial.reabrir'"
        variante="secundario"
        pequeno
        :icono="LockKeyholeOpen"
        @click="estado.reapertura.abrir()"
      >
        Reabrir carga inicial
      </BotonBase>
    </div>
    <p v-if="!cerrada && !puedeCerrar" class="text-xs text-tierra-500">
      Para cerrar la carga inicial, guarde primero la fecha de inicio.
    </p>
  </fieldset>
</template>
