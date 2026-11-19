<script setup lang="ts">
import { HandCoins } from 'lucide-vue-next';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AccionesDelAnticipo from '../componentes/AccionesDelAnticipo.vue';
import AvisosDeLaPantalla from '../componentes/AvisosDeLaPantalla.vue';
import CifrasDelAnticipo from '../componentes/CifrasDelAnticipo.vue';
import SeccionDeFicha from '../componentes/SeccionDeFicha.vue';
import SeccionDeGastos from '../componentes/SeccionDeGastos.vue';
import VentanaDeGastoSinDocumento from '../componentes/VentanaDeGastoSinDocumento.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import {
  detallesDeLaAnulacion,
  detallesDeLaLiquidacion,
  detallesDelAnticipo,
} from '../composables/anticipos/ficha-de-anticipo';
import { usarFichaDeAnticipo } from '../composables/anticipos/usar-ficha-de-anticipo';
import { VENTANAS_CUENTAS_POR_LIQUIDAR } from '../textos';

/** La ficha de un anticipo: lo que falta por justificar, sus gastos y lo que se puede hacer (agregar gastos, liquidar, reabrir, anular). */
const props = defineProps<{ id: string }>();
const { ficha, gastos, cargando, cambio, sinDocumento, ...acciones } = usarFichaDeAnticipo(() => props.id);
const volver = {
  texto: VENTANAS_CUENTAS_POR_LIQUIDAR.anticipos.titulo,
  ruta: { name: 'cuentas-por-liquidar.anticipos' },
};
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="`Anticipo ${ficha.numero}`" :descripcion="`Para ${ficha.beneficiario}`" :volver="volver">
      <InsigniaBase v-if="ficha.estado === 'anulado'" class="self-center" tono="rojo">Anulado</InsigniaBase>
      <InsigniaBase v-else-if="ficha.estado === 'liquidado'" class="self-center" tono="campo">Liquidado</InsigniaBase>
      <InsigniaBase v-else-if="ficha.vencido" class="self-center" tono="trigo"
        >Vencido hace {{ ficha.diasVencido }} días</InsigniaBase
      >
      <AccionesDelAnticipo
        :ficha="ficha"
        :con-gasto-sin-documento="acciones.puedeGastoSinDocumento.value"
        @sin-documento="sinDocumento.abrir"
        @reabrir="acciones.reabrir"
        @anular="acciones.anular"
      />
    </EncabezadoPagina>

    <AvisosDeLaPantalla :avisos="[...ficha.avisos, ...(ficha.aviso ? [ficha.aviso] : [])]" titulo="Tenga en cuenta" />
    <CifrasDelAnticipo v-if="ficha.estado !== 'anulado'" :ficha="ficha" />
    <SeccionDeFicha v-if="ficha.anulacion" titulo="Anulación">
      <DatosDelRegistro :detalles="detallesDeLaAnulacion(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha v-if="ficha.liquidacion" titulo="Liquidación">
      <DatosDelRegistro :detalles="detallesDeLaLiquidacion(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Gastos">
      <SeccionDeGastos :gastos="gastos" :puede-quitar="ficha.estado === 'abierto'" @quitar="acciones.quitar" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Datos del anticipo">
      <DatosDelRegistro :detalles="detallesDelAnticipo(ficha)" />
    </SeccionDeFicha>

    <VentanaDeGastoSinDocumento
      v-model="sinDocumento.edicion.value"
      :conceptos="sinDocumento.conceptos.value"
      :cargando="sinDocumento.cargando.value"
      :errores="sinDocumento.errores.value"
      :enviando="sinDocumento.enviando.value"
      @cerrar="sinDocumento.cerrar"
      @guardar="sinDocumento.guardar"
    />
    <VentanaDeMotivo
      v-model="cambio.edicion.value"
      :errores="cambio.errores.value"
      :enviando="cambio.enviando.value"
      @cerrar="cambio.cerrar"
      @guardar="cambio.confirmar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
  <EstadoVacio
    v-else
    :icono="HandCoins"
    titulo="No se encontró este anticipo"
    descripcion="Puede que el enlace no corresponda a un anticipo de esta empresa o que usted no tenga permiso para verlo. Vuelva a la lista de anticipos."
  />
</template>
