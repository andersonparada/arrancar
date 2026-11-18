<script setup lang="ts">
import { HandCoins } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import AvisosDelPago from '../componentes/AvisosDelPago.vue';
import BarraDelPago from '../componentes/BarraDelPago.vue';
import CamposDelPago from '../componentes/CamposDelPago.vue';
import CargosDelPago from '../componentes/CargosDelPago.vue';
import MedioDePago from '../componentes/MedioDePago.vue';
import PestanasDeFormaDePago from '../componentes/PestanasDeFormaDePago.vue';
import ResultadoDelPago from '../componentes/ResultadoDelPago.vue';
import { usarNuevoPago } from '../composables/pagos/usar-nuevo-pago';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** Pagar a un proveedor: las contraseñas que cubre, la forma, el medio, la fecha y cuánto a cada documento. */
const ventana = VENTANAS_CUENTAS_POR_PAGAR.pagos;
const route = useRoute();
const router = useRouter();
const texto = (valor: unknown): string | undefined => (typeof valor === 'string' && valor ? valor : undefined);
const pago = usarNuevoPago({
  proveedorId: texto(route.query.proveedorId),
  contrasenaId: texto(route.query.contrasenaId),
});
const { edicion, datos } = pago;
const volver = texto(route.query.contrasenaId)
  ? {
      texto: 'Contraseña',
      ruta: { name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: texto(route.query.contrasenaId) } },
    }
  : { texto: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.titulo, ruta: { name: 'cuentas-por-pagar.contrasenas' } };
</script>

<template>
  <div class="space-y-4">
    <EncabezadoPagina :titulo="ventana.nuevo" :descripcion="ventana.descripcionDelNuevo" :volver="volver" />

    <EstadoVacio
      v-if="!pago.cargandoProveedores.value && pago.formas.value.length === 0 && !datos"
      :icono="HandCoins"
      titulo="No tiene permiso para registrar pagos"
      descripcion="Pida a quien administra los permisos que le habilite pagar con cheque, nota de débito o cuenta de apertura."
    />
    <ResultadoDelPago v-else-if="pago.resultado.value" :pago="pago.resultado.value" @otro="pago.pagarOtro" />

    <form v-else class="space-y-4" novalidate @submit.prevent="pago.registrar">
      <TarjetaBase>
        <CampoSelector
          v-model="edicion.proveedorId"
          etiqueta="Proveedor"
          requerido
          :opciones="pago.opcionesDeProveedores.value"
          :error="pago.errores.value.proveedorId && !datos ? pago.errores.value.proveedorId : undefined"
        />
        <p
          v-if="!pago.cargandoProveedores.value && pago.proveedores.value.length === 0"
          class="mt-2 text-sm text-tierra-600 dark:text-tierra-300"
        >
          Ningún proveedor tiene documentos autorizados por pagar. Autorícelos en Documentos por pagar y entréguelos en
          una contraseña.
        </p>
      </TarjetaBase>

      <template v-if="datos">
        <PestanasDeFormaDePago v-model="edicion.forma" :formas="pago.formas.value" />
        <TarjetaBase>
          <h2 class="mb-4 font-semibold">Documentos que se pagan</h2>
          <CargosDelPago
            v-model="pago.edicion"
            :datos="datos"
            :errores="pago.errores.value"
            :puede-saldar="pago.puedeSaldar.value"
            @agregar="pago.agregarContrasena"
            @quitar="pago.quitarContrasena"
          />
        </TarjetaBase>
        <TarjetaBase class="space-y-4">
          <h2 class="font-semibold">Cómo se paga</h2>
          <MedioDePago
            v-model="pago.edicion"
            :medios="pago.medios.value"
            :notas="pago.notas.value"
            :errores="pago.errores.value"
            :cargando="pago.cargandoCatalogos.value"
            :beneficiario="datos.beneficiario"
          />
          <CamposDelPago
            v-model="pago.edicion"
            :errores="pago.errores.value"
            :maximo="pago.fechaMaxima.value"
            :fecha-fija="pago.fechaFija.value"
            :ayuda-de-la-fecha="pago.ayudaDeLaFecha.value"
          />
        </TarjetaBase>
        <AvisosDelPago :avisos="pago.avisos.value" />
        <BarraDelPago
          :total="pago.total.value"
          :retencion="pago.retencion.value"
          :cantidad="pago.lineas.value.length"
          :texto-del-boton="pago.textoDelBoton.value"
          :enviando="pago.enviando.value"
          @cancelar="router.back()"
        />
      </template>
    </form>
  </div>
</template>
