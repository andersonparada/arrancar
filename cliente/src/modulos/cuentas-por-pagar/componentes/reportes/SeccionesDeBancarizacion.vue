<script setup lang="ts">
import { useId } from 'vue';
import type { ReporteDeBancarizacion } from '../../servicios/tipos-de-reportes-de-efectivo';
import TarjetaDeDocumentoSobreElUmbral from './TarjetaDeDocumentoSobreElUmbral.vue';
import TarjetaDeMesDeBancarizacion from './TarjetaDeMesDeBancarizacion.vue';

/** Las dos secciones de R9: meses del proveedor sobre el umbral y documentos sobre el umbral pagados en parte en efectivo. */
defineProps<{ reporte: ReporteDeBancarizacion }>();
const idDeMeses = useId();
const idDeDocumentos = useId();
</script>

<template>
  <div class="space-y-6">
    <section v-if="reporte.meses.length" :aria-labelledby="idDeMeses" class="space-y-2">
      <div>
        <h2 :id="idDeMeses" class="text-base font-semibold">
          Meses sobre el umbral con pagos en efectivo
          <span class="font-normal text-tierra-500 dark:text-tierra-300">({{ reporte.meses.length }})</span>
        </h2>
        <p class="text-xs text-tierra-600 dark:text-tierra-300">
          Lo pagado a un proveedor en el mes (cheques, notas y efectivo) llegó al umbral y parte fue en efectivo.
        </p>
      </div>
      <TarjetaDeMesDeBancarizacion v-for="mes in reporte.meses" :key="`${mes.proveedorId}-${mes.mes}`" :mes="mes" />
    </section>
    <section v-if="reporte.documentosSobreElUmbral.length" :aria-labelledby="idDeDocumentos" class="space-y-2">
      <div>
        <h2 :id="idDeDocumentos" class="text-base font-semibold">
          Documentos sobre el umbral pagados en parte en efectivo
          <span class="font-normal text-tierra-500 dark:text-tierra-300">
            ({{ reporte.documentosSobreElUmbral.length }})
          </span>
        </h2>
        <p class="text-xs text-tierra-600 dark:text-tierra-300">
          El documento llega al umbral y tiene algún pago en efectivo, aunque ningún mes llegue solo.
        </p>
      </div>
      <TarjetaDeDocumentoSobreElUmbral
        v-for="documento in reporte.documentosSobreElUmbral"
        :key="documento.documentoId"
        :documento="documento"
      />
    </section>
  </div>
</template>
