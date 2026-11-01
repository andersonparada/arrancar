<script setup lang="ts">
import { ref } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AvisosDelLibro from '../componentes/libro/AvisosDelLibro.vue';
import PestanasDelSat2237 from '../componentes/sat-2237/PestanasDelSat2237.vue';
import SinSat2237 from '../componentes/sat-2237/SinSat2237.vue';
import VistaComoEnElFormulario from '../componentes/sat-2237/VistaComoEnElFormulario.vue';
import VistaPorRubros from '../componentes/sat-2237/VistaPorRubros.vue';
import { etiquetaDePeriodo } from '../composables/documentos/filtros-de-documentos';
import { usarSat2237 } from '../composables/sat-2237/usar-sat-2237';
import { VENTANA_DEL_SAT_2237 as textos } from '../textos-del-sat-2237';

const comoEnElFormulario = ref(false);
const { periodo, datos, cargando, descargando, opcionesDePeriodo, exportar } = usarSat2237();
</script>

<template>
  <div class="min-w-0">
    <EncabezadoPagina
      :titulo="textos.titulo"
      :descripcion="textos.descripcion"
      :volver="{ texto: textos.volver, ruta: { name: 'libro-de-compras.libro' } }"
    >
      <BotonBase
        v-if="datos?.aplica"
        v-permiso="'libro-de-compras.libro.exportar'"
        variante="secundario"
        :icono="FileSpreadsheet"
        :deshabilitado="descargando"
        @click="exportar"
      >
        {{ textos.exportar }}
      </BotonBase>
    </EncabezadoPagina>

    <div class="mb-4 max-w-xs">
      <CampoSelector v-model="periodo" etiqueta="Período" :opciones="opcionesDePeriodo" />
    </div>

    <div :class="{ 'opacity-60': cargando }" :aria-busy="cargando">
      <p v-if="cargando && !datos" class="text-sm text-tierra-500" role="status">Cargando…</p>
      <SinSat2237 v-else-if="datos && !datos.aplica" :formulario="datos.formulario" :mensaje="datos.mensaje" />
      <template v-else-if="datos">
        <p class="mb-4 text-sm text-tierra-600 dark:text-tierra-300">
          {{ datos.empresa.nombre }} · NIT {{ datos.empresa.nit ?? 'sin registrar' }} ·
          {{ etiquetaDePeriodo(datos.periodo) }}
        </p>
        <AvisosDelLibro :avisos="datos.avisos" />
        <PestanasDelSat2237 v-model="comoEnElFormulario" />
        <VistaComoEnElFormulario v-if="comoEnElFormulario" :datos="datos" />
        <VistaPorRubros v-else :datos="datos" />
      </template>
    </div>
  </div>
</template>
