<script setup lang="ts">
import { Wallet } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import BarraDelReparto from '../componentes/BarraDelReparto.vue';
import CabeceraDelReparto from '../componentes/CabeceraDelReparto.vue';
import ProveedorDelReparto from '../componentes/ProveedorDelReparto.vue';
import ResultadoDelReparto from '../componentes/ResultadoDelReparto.vue';
import { fechaDeHoy } from '../composables/dinero';
import { sePuedePagarConElRetiro } from '../composables/retiros/ficha-de-retiro';
import { usarRepartoDeEfectivo } from '../composables/pagos/usar-reparto-de-efectivo';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** Pagar en efectivo: se reparte el efectivo de un retiro entre uno o varios proveedores, todos los pagos en una operación. */
const props = defineProps<{ id: string }>();
const ventana = VENTANAS_CUENTAS_POR_PAGAR.retiros;
const route = useRoute();
const router = useRouter();
const texto = (valor: unknown): string | undefined => (typeof valor === 'string' && valor ? valor : undefined);
const reparto = usarRepartoDeEfectivo(() => props.id, {
  proveedorId: texto(route.query.proveedorId),
  contrasenaId: texto(route.query.contrasenaId),
});
const { retiro, errores } = reparto;
const volver = computed(() => ({
  texto: retiro.value ? `Retiro ${retiro.value.numero}` : ventana.titulo,
  ruta: { name: 'cuentas-por-pagar.retiros.ficha', params: { id: props.id } },
}));
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.pagar" :descripcion="ventana.descripcionDelPago" :volver="volver" />

    <ResultadoDelReparto
      v-if="reparto.resultado.value"
      :reparto="reparto.resultado.value"
      @otro="reparto.repartirOtro"
    />
    <p v-else-if="reparto.cargandoElRetiro.value" class="text-sm text-tierra-500" role="status">Cargando el retiro…</p>
    <EstadoVacio
      v-else-if="!retiro || !sePuedePagarConElRetiro(retiro)"
      :icono="Wallet"
      titulo="Este retiro no tiene efectivo para repartir"
      :descripcion="
        retiro
          ? 'Ya se liquidó, se anuló o no le queda efectivo. Registre otro retiro o reábralo si hace falta.'
          : 'No se encontró el retiro o usted no tiene permiso para verlo. Vuelva a la lista de retiros.'
      "
    />

    <form v-else class="space-y-4" novalidate @submit.prevent="reparto.registrar">
      <CabeceraDelReparto :retiro="retiro" :queda="reparto.queda.value" />
      <p
        v-if="errores.reparto"
        class="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-300 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
        role="alert"
      >
        {{ errores.reparto }}
      </p>

      <TarjetaBase class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CampoSelector
          model-value=""
          etiqueta="Agregar un proveedor al reparto"
          :opciones="reparto.opcionesParaAgregar.value"
          :deshabilitado="!reparto.puedeAgregarOtro.value"
          @update:model-value="reparto.agregar(String($event ?? ''))"
        />
        <CampoTexto
          v-if="reparto.proveedores.length > 1"
          :model-value="reparto.fechaDeTodos.value"
          etiqueta="Fecha para todos los pagos"
          tipo="date"
          :maximo="fechaDeHoy()"
          @update:model-value="reparto.ponerFechaATodos(String($event ?? ''))"
        />
        <p v-if="reparto.sinProveedores.value" class="text-sm text-tierra-600 sm:col-span-2 dark:text-tierra-300">
          Ningún proveedor tiene documentos autorizados por pagar. Autorícelos en Documentos por pagar y entréguelos en
          una contraseña.
        </p>
      </TarjetaBase>

      <ProveedorDelReparto
        v-for="proveedor in reparto.proveedores"
        :key="proveedor.proveedorId"
        :model-value="proveedor"
        :errores="errores"
        :puede-saldar="reparto.puedeSaldar.value"
        :puede-sin-bancarizar="reparto.puedeSinBancarizar.value"
        :hoy="fechaDeHoy()"
        @quitar="reparto.quitar(proveedor.proveedorId)"
      />

      <BarraDelReparto
        :total="reparto.total.value"
        :proveedores="reparto.proveedores.length"
        :documentos="reparto.documentos.value"
        :enviando="reparto.enviando.value"
        @cancelar="router.back()"
      />
    </form>
  </div>
</template>
