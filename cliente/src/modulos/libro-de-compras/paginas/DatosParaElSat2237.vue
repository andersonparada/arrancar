<script setup lang="ts">
import { FileSpreadsheet, Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import AvisosDelLibro from '../componentes/libro/AvisosDelLibro.vue';
import SeccionDelSat2237 from '../componentes/sat-2237/SeccionDelSat2237.vue';
import SinSat2237 from '../componentes/sat-2237/SinSat2237.vue';
import TablaDeProveedores from '../componentes/sat-2237/TablaDeProveedores.vue';
import TablaDeRubros from '../componentes/sat-2237/TablaDeRubros.vue';
import TablaDelSegmento9 from '../componentes/sat-2237/TablaDelSegmento9.vue';
import { etiquetaDePeriodo } from '../composables/documentos/filtros-de-documentos';
import { usarSat2237 } from '../composables/sat-2237/usar-sat-2237';
import { VENTANA_DEL_SAT_2237 as textos } from '../textos-del-sat-2237';

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
        <p
          class="mb-4 flex items-start gap-2 rounded-2xl bg-campo-100 p-3 text-sm text-campo-900 dark:bg-campo-900/40 dark:text-campo-100"
          role="note"
        >
          <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ textos.notaDeCasillas }}
        </p>
        <AvisosDelLibro :avisos="datos.avisos" />
        <SeccionDelSat2237 :titulo="textos.rubros" :ayuda="textos.rubrosAyuda">
          <TablaDeRubros :rubros="datos.rubros" />
        </SeccionDelSat2237>
        <SeccionDelSat2237 :titulo="textos.segmento9" :ayuda="textos.segmento9Ayuda">
          <TablaDelSegmento9 :operaciones="datos.segmento9" />
        </SeccionDelSat2237>
        <SeccionDelSat2237 :titulo="textos.proveedores" :ayuda="textos.proveedoresAyuda">
          <TablaDeProveedores
            :detalle="datos.proveedores"
            :etiqueta="textos.proveedores"
            :vacio="textos.sinProveedores"
          />
        </SeccionDelSat2237>
        <SeccionDelSat2237 :titulo="textos.facturasEspeciales" :ayuda="textos.facturasEspecialesAyuda">
          <TablaDeProveedores
            :detalle="datos.facturasEspeciales"
            :etiqueta="textos.facturasEspeciales"
            :vacio="textos.sinProveedores"
          />
        </SeccionDelSat2237>
      </template>
    </div>
  </div>
</template>
