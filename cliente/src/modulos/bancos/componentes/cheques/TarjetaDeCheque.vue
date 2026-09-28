<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearTexto } from '@/modulos/core/utilidades/formato';
import type { Cheque } from '../../servicios/cheques.api';

const props = defineProps<{ registro: Cheque }>();
const emit = defineEmits<{ anular: [] }>();

const INSIGNIA_DE_ESTADO: Record<Cheque['estado'], string | undefined> = {
  disponible: undefined,
  emitido: 'Emitido',
  anulado: 'Anulado',
};

const detalles = computed(() => {
  const base = [{ etiqueta: 'No negociable', valor: props.registro.noNegociable ? 'Sí' : 'No' }];
  if (!props.registro.anuladoEn) return base;
  return [...base, { etiqueta: 'Motivo de anulación', valor: formatearTexto(props.registro.motivoDeAnulacion) }];
});
</script>

<template>
  <TarjetaDeRegistro
    :titulo="`Cheque No. ${registro.numero}`"
    :detalles="detalles"
    permiso="bancos.cheques.anular"
    :insignia="INSIGNIA_DE_ESTADO[registro.estado]"
    sin-editar
  >
    <template #acciones-extra>
      <BotonBase
        v-if="registro.estado !== 'anulado'"
        v-permiso="'bancos.cheques.anular'"
        variante="fantasma"
        pequeno
        @click="emit('anular')"
      >
        Anular
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
