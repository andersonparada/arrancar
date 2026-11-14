<script setup lang="ts">
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeContrasena from '../componentes/CamposDeContrasena.vue';
import ResumenDeContrasena from '../componentes/ResumenDeContrasena.vue';
import SeleccionDeDocumentosDeContrasena from '../componentes/SeleccionDeDocumentosDeContrasena.vue';
import { usarNuevaContrasena } from '../composables/contrasenas/usar-nueva-contrasena';
import { fechaDeHoy } from '../composables/dinero';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.contrasenas;
const router = useRouter();
const nueva = usarNuevaContrasena();
const volver = { texto: ventana.titulo, ruta: { name: 'cuentas-por-pagar.contrasenas' } };

async function guardar(): Promise<void> {
  const creada = await nueva.guardar();
  if (!creada) return;
  usarAvisos().exito(`Contraseña ${creada.numero} creada. Ya puede imprimirla y entregarla al proveedor.`);
  await router.push({ name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: creada.id } });
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="guardar">
    <EncabezadoPagina :titulo="ventana.nueva" :volver="volver" />

    <TarjetaBase>
      <h2 class="mb-4 font-semibold">Datos de la contraseña</h2>
      <CamposDeContrasena
        v-model="nueva.edicion"
        :opciones-de-proveedores="nueva.opcionesDeProveedores.value"
        :errores="nueva.errores.value"
        :hoy="fechaDeHoy()"
        @escribir-fecha-de-pago="nueva.escribirFechaDePago"
      />
    </TarjetaBase>

    <TarjetaBase>
      <h2 class="mb-4 font-semibold">Documentos</h2>
      <SeleccionDeDocumentosDeContrasena
        :disponibles="nueva.disponibles.value"
        :cargando="nueva.cargando.value"
        :hay-proveedor="!!nueva.edicion.proveedorId"
        :cargos-marcados="nueva.edicion.cargos"
        :notas-marcadas="nueva.edicion.notas"
        :error="nueva.errores.value.documentos"
        @alternar-cargo="nueva.alternarCargo"
        @alternar-nota="nueva.alternarNota"
        @marcar-cargos="nueva.marcarCargos"
        @marcar-notas="nueva.marcarNotas"
      />
    </TarjetaBase>

    <TarjetaBase v-if="nueva.marcados.value.cargos.length > 0">
      <h2 class="mb-4 font-semibold">Resumen</h2>
      <ResumenDeContrasena
        :totales="nueva.totales.value"
        :cantidad="nueva.marcados.value.cargos.length + nueva.marcados.value.notas.length"
        :notas-con-aviso="nueva.notasConAviso.value"
        :umbral="nueva.umbral.value"
      />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.back()">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="nueva.enviando.value">Crear contraseña</BotonBase>
    </div>
  </form>
</template>
