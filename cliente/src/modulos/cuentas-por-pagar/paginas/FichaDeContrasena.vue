<script setup lang="ts">
import { useRouter } from 'vue-router';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import AccionesDeLaContrasena from '../componentes/AccionesDeLaContrasena.vue';
import DocumentosDeLaContrasena from '../componentes/DocumentosDeLaContrasena.vue';
import SeccionDeFicha from '../componentes/SeccionDeFicha.vue';
import SeccionDePagosDeLaContrasena from '../componentes/SeccionDePagosDeLaContrasena.vue';
import VentanasDeLaContrasena from '../componentes/VentanasDeLaContrasena.vue';
import {
  detallesDeAnulacionDeContrasena,
  detallesDeFichaDeContrasena,
  detallesDeTotalesDeContrasena,
  resumenDeAnularContrasena,
  resumenDeQuitarDocumento,
} from '../composables/contrasenas/ficha-de-contrasena';
import { destinoDeNuevoPago, destinoDePagoEnEfectivo } from '../composables/contrasenas/pagos-de-la-contrasena';
import { nombreDelEstadoDePago, tonoDelEstadoDePago } from '../composables/pagos/detalles-de-pago';
import { usarFichaDeContrasena } from '../composables/contrasenas/usar-ficha-de-contrasena';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** La ficha de una contraseña: sus datos, documentos y totales, y lo que se puede hacer con ella. */
const props = defineProps<{ id: string }>();
const router = useRouter();
const contrasena = usarFichaDeContrasena(() => props.id);
const { ficha, cargando } = contrasena;
const volver = {
  texto: VENTANAS_CUENTAS_POR_PAGAR.contrasenas.titulo,
  ruta: { name: 'cuentas-por-pagar.contrasenas' },
};

const imprimir = () => router.push({ name: 'cuentas-por-pagar.contrasenas.imprimir', params: { id: props.id } });
const pagar = () => ficha.value && router.push(destinoDeNuevoPago(ficha.value));
const pagarEnEfectivo = () => ficha.value && router.push(destinoDePagoEnEfectivo(ficha.value));
const quitar = (documentoId: string, nombre: string) =>
  ficha.value && contrasena.quitar.abrir(documentoId, resumenDeQuitarDocumento(ficha.value, nombre));
const anular = () => ficha.value && contrasena.anular.abrir(props.id, resumenDeAnularContrasena(ficha.value));
</script>

<template>
  <div v-if="ficha" class="space-y-6">
    <EncabezadoPagina :titulo="`Contraseña ${ficha.numero}`" :descripcion="ficha.proveedorNombre" :volver="volver">
      <InsigniaBase v-if="ficha.estado === 'anulada'" class="self-center" tono="rojo">Anulada</InsigniaBase>
      <InsigniaBase v-else class="self-center" :tono="ficha.impresa ? 'campo' : 'tierra'">
        {{ ficha.impresa ? 'Impresa' : 'Sin imprimir' }}
      </InsigniaBase>
      <InsigniaBase
        v-if="ficha.estadoDePago && ficha.estadoDePago !== 'pendiente'"
        class="self-center"
        :tono="tonoDelEstadoDePago(ficha.estadoDePago)"
      >
        {{ nombreDelEstadoDePago(ficha.estadoDePago) }}
      </InsigniaBase>
      <AccionesDeLaContrasena
        :ficha="ficha"
        @imprimir="imprimir"
        @pagar="pagar"
        @pagar-en-efectivo="pagarEnEfectivo"
        @cambiar-fecha="contrasena.cambio.abrir"
        @agregar="contrasena.agregar.abrir"
        @anular="anular"
      />
    </EncabezadoPagina>

    <SeccionDeFicha v-if="ficha.anulacion" titulo="Anulación">
      <DatosDelRegistro :detalles="detallesDeAnulacionDeContrasena(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Datos de la contraseña">
      <DatosDelRegistro :detalles="detallesDeFichaDeContrasena(ficha)" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Documentos">
      <DocumentosDeLaContrasena
        :cargos="ficha.cargos"
        :notas="ficha.notas"
        :puede-quitar="ficha.puedeEditar"
        @quitar="quitar"
      />
    </SeccionDeFicha>
    <SeccionDeFicha v-permiso="'cuentas-por-pagar.pagos.ver'" titulo="Pagos">
      <SeccionDePagosDeLaContrasena :pagos="ficha.pagos" />
    </SeccionDeFicha>
    <SeccionDeFicha titulo="Totales de hoy">
      <DatosDelRegistro :detalles="detallesDeTotalesDeContrasena(ficha)" />
    </SeccionDeFicha>

    <VentanasDeLaContrasena :ficha="ficha" :acciones="contrasena" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
</template>
