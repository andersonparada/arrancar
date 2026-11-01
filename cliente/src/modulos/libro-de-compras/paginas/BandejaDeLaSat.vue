<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Upload } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import PanelDeConciliacion from '../componentes/bandeja/PanelDeConciliacion.vue';
import PanelDeLaBandeja from '../componentes/bandeja/PanelDeLaBandeja.vue';
import PestanasDeLaBandeja from '../componentes/bandeja/PestanasDeLaBandeja.vue';
import {
  IMPORTAR_DE_LA_SAT as importar,
  PESTANA_DE_CONCILIACION,
  VENTANA_DE_LA_SAT as ventana,
  type ClaveDePestana,
} from '../textos-de-la-bandeja';
import { VENTANA_DE_DOCUMENTOS } from '../textos-de-documentos';

/** «DTE de la SAT»: lo que la SAT dice que la empresa recibió, para registrarlo en lote, y su conciliación con el libro. */
const router = useRouter();
const pestana = ref<ClaveDePestana>('pendiente');
const busqueda = ref('');
const volver = { texto: VENTANA_DE_DOCUMENTOS.titulo, ruta: { name: 'libro-de-compras.documentos' } };

/** Desde la conciliación: la fila de la SAT que falta registrar, buscada por su número en la pestaña de pendientes. */
function verEnLaBandeja(texto: string): void {
  busqueda.value = texto;
  pestana.value = 'pendiente';
}

// La búsqueda de la conciliación vale solo para esa llegada; el panel ya la leyó al crearse.
watch(pestana, () => (busqueda.value = ''), { flush: 'post' });
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion" :volver="volver">
      <BotonBase
        v-permiso="'libro-de-compras.documentos.importar'"
        variante="secundario"
        :icono="Upload"
        deshabilitado
        aria-describedby="ayuda-de-importar"
      >
        {{ importar.cargarArchivo }}
      </BotonBase>
      <BotonBase
        v-permiso="'libro-de-compras.documentos.crear'"
        variante="secundario"
        :icono="Plus"
        @click="router.push({ name: 'libro-de-compras.documentos.nuevo' })"
      >
        {{ ventana.registrarAMano }}
      </BotonBase>
    </EncabezadoPagina>
    <p
      id="ayuda-de-importar"
      v-permiso="'libro-de-compras.documentos.importar'"
      class="-mt-3 mb-4 flex flex-wrap items-center gap-2 text-sm text-tierra-600 dark:text-tierra-300"
    >
      <InsigniaBase tono="trigo">{{ importar.proximamente }}</InsigniaBase>
      {{ importar.ayuda }}
    </p>

    <PestanasDeLaBandeja v-model="pestana" />
    <PanelDeConciliacion v-if="pestana === PESTANA_DE_CONCILIACION" @ver-en-la-bandeja="verEnLaBandeja" />
    <PanelDeLaBandeja
      v-else
      :key="pestana"
      :estado="pestana"
      :busqueda-inicial="pestana === 'pendiente' ? busqueda : ''"
    />
  </div>
</template>
