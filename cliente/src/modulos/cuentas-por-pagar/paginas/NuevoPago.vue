<script setup lang="ts">
import { HandCoins } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import SeleccionDeProveedorDelPago from '../componentes/SeleccionDeProveedorDelPago.vue';
import { avisoDeChequesDeAperturaSinLigar } from '../composables/cheques-de-apertura-sin-ligar';
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
const avisosDeApertura = computed(() => {
  const aviso = avisoDeChequesDeAperturaSinLigar(datos.value?.chequesDeAperturaSinLigar);
  return aviso ? [aviso] : [];
});
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
      v-if="pago.sinPermisosDePago.value"
      :icono="HandCoins"
      titulo="No tiene permiso para registrar pagos"
      descripcion="Pida a quien administra los permisos que le habilite pagar con cheque, nota de débito o cuenta de apertura."
    />
    <ResultadoDelPago v-else-if="pago.resultado.value" :pago="pago.resultado.value" @otro="pago.pagarOtro" />

    <form v-else class="space-y-4" novalidate @submit.prevent="pago.registrar">
      <SeleccionDeProveedorDelPago
        v-model="edicion.proveedorId"
        :opciones="pago.opcionesDeProveedores.value"
        :incompleta="pago.listaIncompleta.value"
        :sin-proveedores="!pago.cargandoProveedores.value && pago.proveedores.value.length === 0"
        :error="pago.errores.value.proveedorId && !datos ? pago.errores.value.proveedorId : undefined"
        @buscar="pago.alBuscarProveedor"
      />

      <AvisosDelPago :avisos="avisosDeApertura" titulo="Cheques posfechados de apertura" />
      <p
        v-if="datos && pago.formas.value.length === 0"
        class="rounded-lg bg-trigo-100 p-3 text-sm text-tierra-800 dark:bg-tierra-800 dark:text-tierra-100"
        role="status"
      >
        Este proveedor no tiene saldos iniciales por pagar, y su permiso solo le deja pagarlos con cuenta de apertura.
        Pida a quien administra los permisos que le habilite pagar con cheque o nota de débito.
      </p>
      <template v-else-if="datos">
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
            v-model:filtro-de-notas="pago.filtroDeNotas"
            :medios="pago.medios.value"
            :notas="pago.notas.value"
            :cuentas-de-notas="pago.cuentasDeNotas.value"
            :notas-al-tope="pago.notasAlTope.value"
            :cargando-notas="pago.cargandoNotas.value"
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
