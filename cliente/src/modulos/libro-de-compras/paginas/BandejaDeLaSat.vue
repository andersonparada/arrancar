<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Upload } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import PanelDeLaBandeja from '../componentes/bandeja/PanelDeLaBandeja.vue';
import PestanasDeLaBandeja from '../componentes/bandeja/PestanasDeLaBandeja.vue';
import {
  IMPORTAR_DE_LA_SAT as importar,
  VENTANA_DE_LA_SAT as ventana,
  type ClaveDePestana,
} from '../textos-de-la-bandeja';
import { VENTANA_DE_DOCUMENTOS } from '../textos-de-documentos';

/** «DTE de la SAT»: lo que la SAT dice que la empresa recibió, para registrarlo en lote. */
const router = useRouter();
const pestana = ref<ClaveDePestana>('pendiente');
const volver = { texto: VENTANA_DE_DOCUMENTOS.titulo, ruta: { name: 'libro-de-compras.documentos' } };
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
    <PanelDeLaBandeja :key="pestana" :estado="pestana" busqueda-inicial="" />
  </div>
</template>
