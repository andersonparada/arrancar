<script setup lang="ts">
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import FormularioDelServidorDeCorreo from '../componentes/correo/FormularioDelServidorDeCorreo.vue';
import TarjetaDeLaBandeja from '../componentes/correo/TarjetaDeLaBandeja.vue';
import TarjetaDePruebaDeCorreo from '../componentes/correo/TarjetaDePruebaDeCorreo.vue';
import { usarCorreoDeSoporte } from '../composables/correo/usar-correo-de-soporte';
import { VENTANAS_CORE } from '../textos';

/** Soporte → Correo: el servidor SMTP de la instalación, la prueba de envío y el estado de la bandeja. */
const correo = usarCorreoDeSoporte();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.correo.titulo" :descripcion="VENTANAS_CORE.correo.descripcion" />
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-6">
        <FormularioDelServidorDeCorreo
          v-model="correo.borrador.value"
          :guardado="correo.guardado.value"
          :errores="correo.errores.value"
          :enviando="correo.enviando.value"
          :hay-cambios="correo.hayCambiosSinGuardar.value"
          :sin-contrasena="correo.sinContrasena.value"
          @guardar="correo.guardar"
        />
        <TarjetaDeLaBandeja
          :bandeja="correo.bandeja.value"
          :cargando="correo.cargandoBandeja.value"
          @actualizar="correo.recargarBandeja"
        />
      </div>
      <TarjetaDePruebaDeCorreo
        v-model="correo.destino.value"
        :guardado="correo.guardado.value"
        :probando="correo.probando.value"
        :resultado="correo.resultado.value"
        :hay-cambios="correo.hayCambiosSinGuardar.value"
        @probar="correo.probar"
      />
    </div>
  </div>
</template>
