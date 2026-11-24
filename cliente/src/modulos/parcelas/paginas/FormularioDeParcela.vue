<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeParcela from '../componentes/parcelas/CamposDeParcela.vue';
import { usarFormularioDeParcela } from '../composables/parcelas/usar-formulario-de-parcela';
import { VENTANAS_PARCELAS } from '../textos';

/** Alta y edición en página completa; sin `parcelaId` es una parcela nueva. */
const props = defineProps<{ parcelaId?: string }>();

const router = useRouter();
const ventana = VENTANAS_PARCELAS.parcelas;
const formulario = usarFormularioDeParcela(props.parcelaId ?? null);
const { edicion, medicion, cargando, enviando } = formulario;
const volver = props.parcelaId
  ? { texto: 'Volver a la ficha', ruta: { name: 'parcelas.parcelas.ficha', params: { parcelaId: props.parcelaId } } }
  : { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'parcelas.parcelas' } };

async function guardarYVerFicha(): Promise<void> {
  const guardada = await formulario.guardar();
  if (guardada) await router.push({ name: 'parcelas.parcelas.ficha', params: { parcelaId: guardada.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="parcelaId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <p v-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <TarjetaBase v-else>
      <CamposDeParcela
        v-model="edicion"
        v-model:medicion="medicion"
        :errores="formulario.errores.value"
        :errores-de-medicion="formulario.erroresDeLaMedicion.value"
        :referencias="formulario.referencias.value"
        :ajustes="formulario.ajustes.value"
        :ubicacion="formulario.ubicacion.value"
      />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
