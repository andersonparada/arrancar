<script setup lang="ts">
import { Banknote } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeCancelacionDeCorreo from '@/modulos/core/componentes/correo/VentanaDeCancelacionDeCorreo.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AccionesDelPago from '../componentes/AccionesDelPago.vue';
import LineasDelPago from '../componentes/LineasDelPago.vue';
import SeccionDeFicha from '../componentes/SeccionDeFicha.vue';
import SeccionDelAvisoDePago from '../componentes/SeccionDelAvisoDePago.vue';
import VentanaDeAvisoDePago from '../componentes/VentanaDeAvisoDePago.vue';
import VentanaDeAnulacionDePago from '../componentes/VentanaDeAnulacionDePago.vue';
import VentanaDeReaplicacion from '../componentes/VentanaDeReaplicacion.vue';
import {
  AVISO_DE_COBRADO,
  detallesDeAnulacionDePago,
  detallesDeFichaDePago,
  estaCobrado,
} from '../composables/pagos/ficha-de-pago';
import { usarFichaDePago } from '../composables/pagos/usar-ficha-de-pago';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** La ficha de un pago: sus datos, lo que cubrió en cada documento y lo que se puede hacer con él. */
const props = defineProps<{ id: string }>();
const router = useRouter();
const pago = usarFichaDePago(() => props.id);
const { ficha, cargando, aviso } = pago;
const volver = { texto: VENTANAS_CUENTAS_POR_PAGAR.pagos.titulo, ruta: { name: 'cuentas-por-pagar.pagos' } };
const comprobante = () => router.push({ name: 'cuentas-por-pagar.pagos.comprobante', params: { id: props.id } });
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="`Pago ${ficha.numero}`" :descripcion="ficha.proveedor.nombre" :volver="volver">
      <InsigniaBase v-if="ficha.estado === 'anulado'" class="self-center" tono="rojo">Anulado</InsigniaBase>
      <InsigniaBase v-else-if="ficha.posfechado" class="self-center" tono="trigo">Posfechado</InsigniaBase>
      <InsigniaBase v-if="estaCobrado(ficha)" class="self-center" tono="campo">Cobrado</InsigniaBase>
      <AccionesDelPago
        :ficha="ficha"
        @comprobante="comprobante"
        @reaplicar="pago.reaplicar.abrir"
        @anular="pago.anular.abrir"
      />
    </EncabezadoPagina>

    <p v-if="estaCobrado(ficha)" class="rounded-xl bg-trigo-300/30 p-3 text-sm dark:bg-trigo-500/10" role="status">
      {{ AVISO_DE_COBRADO }}
    </p>
    <SeccionDeFicha v-if="ficha.anulacion" titulo="Anulación">
      <DatosDelRegistro :detalles="detallesDeAnulacionDePago(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Datos del pago">
      <DatosDelRegistro :detalles="detallesDeFichaDePago(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Documentos que cubre">
      <LineasDelPago :ficha="ficha" :ocupado="pago.saldar.procesando.value" @saldar="pago.saldar.saldar" />
    </SeccionDeFicha>

    <SeccionDeFicha titulo="Aviso por correo">
      <SeccionDelAvisoDePago
        :aviso="aviso.aviso.value"
        :cargando="aviso.cargando.value"
        :anulado="ficha.estado === 'anulado'"
        @enviar="aviso.envio.abrir"
        @cancelar="aviso.cancelacion.abrir"
      />
    </SeccionDeFicha>

    <VentanaDeAnulacionDePago
      v-model="pago.anular.edicion.value"
      :titulo="`Anular el pago ${ficha.numero}`"
      :errores="pago.anular.errores.value"
      :enviando="pago.anular.enviando.value"
      @cerrar="pago.anular.cerrar"
      @guardar="pago.anular.confirmar"
    />
    <template v-if="aviso.aviso.value">
      <VentanaDeAvisoDePago
        v-model="aviso.envio.edicion.value"
        :aviso="aviso.aviso.value"
        :enviando="aviso.envio.enviando.value"
        @cerrar="aviso.envio.cerrar"
        @alternar="aviso.envio.alternar"
        @enviar="aviso.envio.confirmar"
      />
      <VentanaDeCancelacionDeCorreo
        v-model="aviso.cancelacion.motivo.value"
        :abierta="aviso.cancelacion.abierta.value"
        :asunto="aviso.aviso.value.vistaPrevia.asunto"
        :errores="aviso.cancelacion.errores.value"
        :enviando="aviso.cancelacion.enviando.value"
        @cerrar="aviso.cancelacion.cerrar"
        @confirmar="aviso.cancelacion.confirmar"
      />
    </template>
    <VentanaDeReaplicacion
      v-model="pago.reaplicar.edicion.value"
      :numero="ficha.numero"
      :monto="ficha.monto"
      :candidatos="pago.reaplicar.candidatos.value"
      :texto-de-la-suma="pago.reaplicar.textoDeLaSuma.value"
      :errores="pago.reaplicar.errores.value"
      :cargando="pago.reaplicar.cargando.value"
      :enviando="pago.reaplicar.enviando.value"
      @cerrar="pago.reaplicar.cerrar"
      @guardar="pago.reaplicar.confirmar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
  <EstadoVacio
    v-else
    :icono="Banknote"
    titulo="No se encontró este pago"
    descripcion="Puede que se haya abierto desde un enlace de otro módulo que no corresponde a un pago, o que usted no tenga permiso para verlo. Vuelva a la lista de pagos."
  />
</template>
