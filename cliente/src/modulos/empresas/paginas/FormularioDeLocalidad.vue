<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeLocalidad from '../componentes/localidades/CamposDeLocalidad.vue';
import { usarFormularioDeLocalidad } from '../composables/localidades/usar-formulario-de-localidad';
import { VENTANAS_EMPRESAS } from '../textos';

/** Alta y edición en página completa; sin `localidadId` es una localidad nueva. */
const props = defineProps<{ localidadId?: string }>();

const router = useRouter();
const ventana = VENTANAS_EMPRESAS.localidades;
const { edicion, cargando, enviando, errores, referencias, guardar } = usarFormularioDeLocalidad(
  props.localidadId ?? null,
);
const volver = props.localidadId
  ? {
      texto: 'Volver a la ficha',
      ruta: { name: 'empresas.localidades.ficha', params: { localidadId: props.localidadId } },
    }
  : { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'empresas.localidades' } };

async function guardarYVerFicha(): Promise<void> {
  const guardado = await guardar();
  if (guardado) await router.push({ name: 'empresas.localidades.ficha', params: { localidadId: guardado.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="localidadId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else>
      <CamposDeLocalidad v-model="edicion" :errores="errores" :referencias="referencias" />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
