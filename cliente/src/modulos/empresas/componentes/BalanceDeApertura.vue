<script setup lang="ts">
import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import DocumentoAdjunto from '@/modulos/core/componentes/archivos/DocumentoAdjunto.vue';
import VisorDeDocumento from '@/modulos/core/componentes/archivos/VisorDeDocumento.vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { AYUDA_DEL_BALANCE, type AccionesDelBalance } from '../composables/balance-de-apertura';
import type { BalanceDeApertura } from '../servicios/cierre-de-carga.tipos';

/** El balance de apertura firmado: sube, reemplaza y quita quien puede cerrar la carga; lo ve quien ve los cierres. */
const props = defineProps<{
  balance: BalanceDeApertura | null;
  acciones: AccionesDelBalance;
  enviando: boolean;
  error: string;
  direccion: string;
  visorAbierto: boolean;
}>();
const emit = defineEmits<{ subir: [archivo: File]; quitar: []; ver: []; cerrarVisor: [] }>();

const sesion = usarSesion();
const puedeCambiar = computed(() => sesion.puede('empresas.carga-inicial.cerrar'));
const archivo = computed(() => (props.balance ? { ...props.balance, tipoMime: 'application/pdf' } : null));
</script>

<template>
  <div class="space-y-2">
    <DocumentoAdjunto
      titulo="Balance de apertura firmado"
      :archivo="archivo"
      aceptar="application/pdf"
      :puede-subir="puedeCambiar && acciones.puedeSubir"
      :puede-quitar="puedeCambiar && acciones.puedeQuitar"
      :puede-ver="sesion.puede('empresas.carga-inicial.ver-cierres')"
      :enviando="enviando"
      :error="error"
      texto-vacio="No se adjuntó el balance de apertura firmado por el comerciante y el contador."
      :texto-de-subir="acciones.textoDeSubir"
      :ayuda="AYUDA_DEL_BALANCE"
      @subir="emit('subir', $event)"
      @quitar="emit('quitar')"
      @ver="emit('ver')"
    />
    <p v-if="acciones.nota" class="text-xs text-tierra-500">{{ acciones.nota }}</p>
    <VentanaModal :abierta="visorAbierto" titulo="Balance de apertura" ancha encima @cerrar="emit('cerrarVisor')">
      <VisorDeDocumento
        v-if="balance"
        :direccion="direccion"
        titulo="Balance de apertura firmado (PDF)"
        :clave="balance.sha256"
      />
      <template #pie>
        <BotonBase variante="secundario" @click="emit('cerrarVisor')">Cerrar</BotonBase>
      </template>
    </VentanaModal>
  </div>
</template>
