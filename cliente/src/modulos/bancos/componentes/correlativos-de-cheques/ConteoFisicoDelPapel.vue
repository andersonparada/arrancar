<script setup lang="ts">
/**
 * El cuadro del final del papel: el conteo físico del papel en blanco lo hace alguien distinto de quien emite los cheques
 * y lo firma. El sistema no guarda el conteo (es papel firmado); solo imprime lo que debería haber.
 */
defineProps<{ disponiblesSegunElSistema: number; nota: string }>();
</script>

<template>
  <section
    class="hidden break-inside-avoid border-2 border-black p-3 text-sm print:block"
    aria-label="Conteo físico del papel en blanco"
  >
    <h2 class="font-semibold">Conteo físico del papel en blanco</h2>
    <p class="mt-1">
      Disponibles según el sistema: <strong>{{ disponiblesSegunElSistema }}</strong>
    </p>
    <p class="mt-3">Contados: ______________</p>
    <p class="mt-3">Contó (nombre y firma): ____________________________________________</p>
    <p class="mt-3">Fecha: ____________________</p>
    <p class="mt-3 text-xs">{{ nota }}</p>
  </section>
</template>
