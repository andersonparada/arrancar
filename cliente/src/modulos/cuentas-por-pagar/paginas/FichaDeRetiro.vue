<script setup lang="ts">
import { Wallet } from 'lucide-vue-next';
import { RouterLink, useRouter } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AccionesDelRetiro from '../componentes/AccionesDelRetiro.vue';
import AvisosDelPago from '../componentes/AvisosDelPago.vue';
import PagosDelRetiro from '../componentes/PagosDelRetiro.vue';
import SeccionDeFicha from '../componentes/SeccionDeFicha.vue';
import VentanaDeCambioDeRetiro from '../componentes/VentanaDeCambioDeRetiro.vue';
import VentanaDeLiquidacion from '../componentes/VentanaDeLiquidacion.vue';
import { fechaDeHoy } from '../composables/dinero';
import {
  detallesDeAnulacionDeRetiro,
  detallesDeFichaDeRetiro,
  detallesDeLaLiquidacion,
} from '../composables/retiros/ficha-de-retiro';
import { usarFichaDeRetiro } from '../composables/retiros/usar-ficha-de-retiro';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** La ficha de un retiro: sus datos, los pagos que salieron de él y lo que se puede hacer (pagar, liquidar, reabrir, anular). */
const props = defineProps<{ id: string }>();
const router = useRouter();
const retiro = usarFichaDeRetiro(() => props.id);
const { ficha, cargando, liquidar, reabrir, anular } = retiro;
const volver = { texto: VENTANAS_CUENTAS_POR_PAGAR.retiros.titulo, ruta: { name: 'cuentas-por-pagar.retiros' } };
const pagar = () => router.push({ name: 'cuentas-por-pagar.retiros.pagar', params: { id: props.id } });
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="`Retiro ${ficha.numero}`" :descripcion="`Custodio: ${ficha.custodio}`" :volver="volver">
      <InsigniaBase v-if="ficha.estado === 'anulado'" class="self-center" tono="rojo">Anulado</InsigniaBase>
      <InsigniaBase v-else-if="ficha.estado === 'liquidado'" class="self-center" tono="campo">Liquidado</InsigniaBase>
      <InsigniaBase v-else-if="ficha.deMesAnterior" class="self-center" tono="trigo">De un mes anterior</InsigniaBase>
      <AccionesDelRetiro
        :ficha="ficha"
        @pagar="pagar"
        @liquidar="liquidar.abrir"
        @reabrir="reabrir.abrir"
        @anular="anular.abrir"
      />
    </EncabezadoPagina>

    <AvisosDelPago :avisos="ficha.avisos" titulo="Tenga en cuenta" />
    <SeccionDeFicha v-if="ficha.anulacion" titulo="Anulación">
      <DatosDelRegistro :detalles="detallesDeAnulacionDeRetiro(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Datos del retiro">
      <DatosDelRegistro :detalles="detallesDeFichaDeRetiro(ficha)" />
      <RouterLink
        v-permiso="'bancos.cuentas-bancarias.ver'"
        :to="{
          name: 'bancos.cuentas-bancarias.ficha',
          params: { cuentaBancariaId: ficha.movimiento.cuentaBancariaId },
        }"
        class="mt-2 inline-block text-sm font-medium text-campo-700 underline dark:text-campo-300"
      >
        Ver la cuenta en Bancos
      </RouterLink>
    </SeccionDeFicha>
    <SeccionDeFicha v-if="ficha.liquidacion" titulo="Liquidación">
      <DatosDelRegistro :detalles="detallesDeLaLiquidacion(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Pagos que salieron de este retiro">
      <PagosDelRetiro :ficha="ficha" />
    </SeccionDeFicha>

    <VentanaDeLiquidacion
      v-model="liquidar.edicion.value"
      :cuentas="liquidar.opcionesDeCuentas.value"
      :errores="liquidar.errores.value"
      :enviando="liquidar.enviando.value"
      :hoy="fechaDeHoy()"
      @cerrar="liquidar.cerrar"
      @guardar="liquidar.confirmar"
      @devuelto="liquidar.escribirDevuelto"
      @faltante="liquidar.escribirFaltante"
    />
    <VentanaDeCambioDeRetiro
      v-model="reabrir.edicion.value"
      :titulo="`Reabrir el retiro ${ficha.numero}`"
      texto-del-boton="Reabrir el retiro"
      :errores="reabrir.errores.value"
      :enviando="reabrir.enviando.value"
      @cerrar="reabrir.cerrar"
      @guardar="reabrir.confirmar"
    />
    <VentanaDeCambioDeRetiro
      v-model="anular.edicion.value"
      :titulo="`Anular el retiro ${ficha.numero}`"
      texto-del-boton="Anular el retiro"
      peligroso
      :errores="anular.errores.value"
      :enviando="anular.enviando.value"
      @cerrar="anular.cerrar"
      @guardar="anular.confirmar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
  <EstadoVacio
    v-else
    :icono="Wallet"
    titulo="No se encontró este retiro"
    descripcion="Puede que el enlace no corresponda a un retiro de esta empresa o que usted no tenga permiso para verlo. Vuelva a la lista de retiros."
  />
</template>
