<script setup lang="ts">
import type { Sat2237 } from '../../servicios/sat-2237.api';
import { VENTANA_DEL_SAT_2237 as textos } from '../../textos-del-sat-2237';
import SeccionDelSat2237 from './SeccionDelSat2237.vue';
import TablaDeProveedores from './TablaDeProveedores.vue';
import TablaDeRubros from './TablaDeRubros.vue';
import TablaDelSegmento9 from './TablaDelSegmento9.vue';

/** Los datos agrupados por rubro, operación y proveedor, tal como los calcula Arrancar. */
defineProps<{ datos: Sat2237 }>();
</script>

<template>
  <div>
    <SeccionDelSat2237 :titulo="textos.rubros" :ayuda="textos.rubrosAyuda">
      <TablaDeRubros :rubros="datos.rubros" />
    </SeccionDelSat2237>
    <SeccionDelSat2237 :titulo="textos.segmento9" :ayuda="textos.segmento9Ayuda">
      <TablaDelSegmento9 :operaciones="datos.segmento9" />
    </SeccionDelSat2237>
    <SeccionDelSat2237 :titulo="textos.proveedores" :ayuda="textos.proveedoresAyuda">
      <TablaDeProveedores :detalle="datos.proveedores" :etiqueta="textos.proveedores" :vacio="textos.sinProveedores" />
    </SeccionDelSat2237>
    <SeccionDelSat2237 :titulo="textos.facturasEspeciales" :ayuda="textos.facturasEspecialesAyuda">
      <TablaDeProveedores
        :detalle="datos.facturasEspeciales"
        :etiqueta="textos.facturasEspeciales"
        :vacio="textos.sinProveedores"
      />
    </SeccionDelSat2237>
  </div>
</template>
