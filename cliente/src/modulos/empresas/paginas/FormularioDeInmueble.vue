<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeInmueble from '../componentes/inmuebles/CamposDeInmueble.vue';
import { usarFormularioDeInmueble } from '../composables/inmuebles/usar-formulario-de-inmueble';
import { VENTANAS_EMPRESAS } from '../textos';

/** Alta y edición en página completa; sin `inmuebleId` es un inmueble nuevo. */
const props = defineProps<{ inmuebleId?: string }>();

const router = useRouter();
const ventana = VENTANAS_EMPRESAS.inmuebles;
const { edicion, cargando, enviando, errores, referencias, guardar } = usarFormularioDeInmueble(
  props.inmuebleId ?? null,
);
const volver = props.inmuebleId
  ? { texto: 'Volver a la ficha', ruta: { name: 'empresas.inmuebles.ficha', params: { inmuebleId: props.inmuebleId } } }
  : { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'empresas.inmuebles' } };

async function guardarYVerFicha(): Promise<void> {
  const guardado = await guardar();
  if (guardado) await router.push({ name: 'empresas.inmuebles.ficha', params: { inmuebleId: guardado.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="inmuebleId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else>
      <CamposDeInmueble v-model="edicion" :errores="errores" :referencias="referencias" />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
