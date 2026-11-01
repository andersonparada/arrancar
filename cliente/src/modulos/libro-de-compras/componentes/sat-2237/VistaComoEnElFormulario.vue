<script setup lang="ts">
import { computed } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import { avisoDeProveedoresSinLugar } from '../../composables/sat-2237/datos-del-sat-2237';
import type { Sat2237 } from '../../servicios/sat-2237.api';
import { VENTANA_DEL_SAT_2237 as textos } from '../../textos-del-sat-2237';
import SeccionDelSat2237 from './SeccionDelSat2237.vue';
import TablaDeCasillas from './TablaDeCasillas.vue';
import TablaDeProveedores from './TablaDeProveedores.vue';
import TablaDeSeccion6 from './TablaDeSeccion6.vue';
import TablaDeSeccion9 from './TablaDeSeccion9.vue';

/** Las secciones 5, 6 y 9 con los nombres del formulario, y el anexo de facturas especiales aparte. */
const props = defineProps<{ datos: Sat2237 }>();
const vista = computed(() => props.datos.comoEnElFormulario);
const faltan = computed(() => avisoDeProveedoresSinLugar(vista.value.seccion6.sinLugar, vista.value.seccion6.maximo));
</script>

<template>
  <div>
    <p
      v-if="!vista.confirmado"
      class="mb-2 flex items-start gap-2 rounded-2xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
      role="alert"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong>{{ textos.sinConfirmarTitulo }}</strong> ({{ vista.version }}). {{ textos.sinConfirmar }}
      </span>
    </p>
    <SeccionDelSat2237 :titulo="`5. ${vista.seccion5.nombre}`" :ayuda="textos.seccion5Ayuda">
      <TablaDeCasillas :casillas="vista.seccion5.casillas" :rubros="datos.rubros" />
    </SeccionDelSat2237>
    <SeccionDelSat2237 :titulo="`6. ${vista.seccion6.nombre}`" :ayuda="textos.seccion6Ayuda">
      <TablaDeSeccion6 :proveedores="vista.seccion6.filas" />
      <p v-if="faltan" class="mt-2 text-sm text-tierra-700 dark:text-tierra-200" role="note">{{ faltan }}</p>
    </SeccionDelSat2237>
    <SeccionDelSat2237 :titulo="`9. ${vista.seccion9.nombre}`" :ayuda="textos.seccion9Ayuda">
      <TablaDeSeccion9 :seccion="vista.seccion9" />
    </SeccionDelSat2237>
    <SeccionDelSat2237 :titulo="textos.facturasEspeciales" :ayuda="textos.facturasEspecialesNota">
      <TablaDeProveedores
        :detalle="datos.facturasEspeciales"
        :etiqueta="textos.facturasEspeciales"
        :vacio="textos.sinProveedores"
      />
    </SeccionDelSat2237>
  </div>
</template>
