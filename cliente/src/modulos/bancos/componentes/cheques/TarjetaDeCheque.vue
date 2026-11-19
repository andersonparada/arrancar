<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearTexto } from '@/modulos/core/utilidades/formato';
import { detalleDeApertura } from '../../composables/comunes/de-apertura';
import { insigniaDeCheque } from '../../composables/cheques/insignia-de-cheque';
import { textoDeCausaDeAnulacion } from '../../composables/movimientos/origen-y-causa';
import type { Cheque } from '../../servicios/cheques.api';

const props = defineProps<{ registro: Cheque }>();
/** Un cheque de su chequera. «Anular» y «Blanquear» aparecen solo si el servidor dice que se puede. */
const emit = defineEmits<{ anular: []; blanquear: [] }>();

const detalles = computed(() => {
  const apertura = detalleDeApertura(props.registro);
  const base = [
    { etiqueta: 'No negociable', valor: props.registro.noNegociable ? 'Sí' : 'No' },
    ...(apertura ? [apertura] : []),
  ];
  if (!props.registro.anuladoEn) return base;
  const causa = textoDeCausaDeAnulacion(props.registro.causaDeAnulacion);
  const conCausa = causa ? [...base, { etiqueta: 'Causa de anulación', valor: causa }] : base;
  return [...conCausa, { etiqueta: 'Motivo de anulación', valor: formatearTexto(props.registro.motivoDeAnulacion) }];
});
</script>

<template>
  <TarjetaDeRegistro
    :titulo="`Cheque No. ${registro.numero}`"
    :detalles="detalles"
    permiso="bancos.cheques.anular"
    :insignia="insigniaDeCheque(registro)"
    sin-editar
  >
    <template #acciones-extra>
      <BotonBase
        v-if="registro.puedeAnular"
        v-permiso="'bancos.cheques.anular'"
        variante="fantasma"
        pequeno
        @click="emit('anular')"
      >
        Anular
      </BotonBase>
      <BotonBase
        v-if="registro.puedeBlanquear"
        v-permiso="'bancos.cheques.blanquear'"
        variante="fantasma"
        pequeno
        @click="emit('blanquear')"
      >
        Blanquear
      </BotonBase>
    </template>
  </TarjetaDeRegistro>
</template>
