<script setup lang="ts">
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeArticulo from '../componentes/articulos/CamposDeArticulo.vue';
import { usarFormularioDeArticulo } from '../composables/articulos/usar-formulario-de-articulo';
import { VENTANAS_INVENTARIOS } from '../textos';

/** Alta y edición en página completa; sin `articuloId` es un artículo nuevo. */
const props = defineProps<{ articuloId?: string }>();

const router = useRouter();
const ventana = VENTANAS_INVENTARIOS.articulos;
const { edicion, cargando, enviando, errores, referencias, guardar } = usarFormularioDeArticulo(
  props.articuloId ?? null,
);
const volver = props.articuloId
  ? {
      texto: 'Volver a la ficha',
      ruta: { name: 'inventarios.articulos.ficha', params: { articuloId: props.articuloId } },
    }
  : { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'inventarios.articulos' } };

async function guardarYVerFicha(): Promise<void> {
  const guardado = await guardar();
  if (guardado) await router.push({ name: 'inventarios.articulos.ficha', params: { articuloId: guardado.id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardarYVerFicha">
    <EncabezadoPagina :titulo="articuloId ? ventana.editar : ventana.nuevo" :volver="volver" />

    <p v-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
    <TarjetaBase v-else>
      <CamposDeArticulo v-model="edicion" :errores="errores" :referencias="referencias" />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.push(volver.ruta)">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="enviando">Guardar</BotonBase>
    </div>
  </form>
</template>
