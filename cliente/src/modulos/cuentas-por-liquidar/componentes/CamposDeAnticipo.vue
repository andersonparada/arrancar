<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { UserPlus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import {
  MAXIMO_DE_LA_DESCRIPCION,
  MAXIMO_DE_REFERENCIA,
  MAXIMO_DEL_MOTIVO,
  OPCIONES_DE_CLASE,
  type EdicionDeAnticipo,
} from '../composables/anticipos/edicion-de-anticipo';
import { OPCIONES_DE_FORMA, opcionesDelMedio } from '../composables/anticipos/opciones-de-medios';
import { fechaDeHoy } from '../composables/reportes/fechas-de-reportes';
import type { MediosParaElegir } from '../servicios/opciones.api';

/** Los campos del anticipo: a quién, para qué, cuánto, con qué y hasta cuándo debe justificarlo. */
const props = defineProps<{
  medios: MediosParaElegir | null;
  beneficiarios: OpcionBuscable<string>[];
  usuarios: OpcionBuscable<string>[];
  puedeElegirUsuario: boolean;
  puedeVerTerceros: boolean;
  puedeCrearTerceros: boolean;
  cargando: boolean;
  hayVencidos: boolean;
  fechaLimitePropuesta: string;
  errores: Record<string, string>;
}>();
defineEmits<{ nuevoBeneficiario: [] }>();
const edicion = defineModel<EdicionDeAnticipo>({ required: true });

const esCheque = computed(() => edicion.value.forma === 'cheque');
const opcionesDelMedioElegido = computed(() => opcionesDelMedio(edicion.value.forma, props.medios));
const sinMedios = computed(() => !props.cargando && opcionesDelMedioElegido.value.length === 0);
const hoy = fechaDeHoy();
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <CampoSelector
        v-model="edicion.beneficiarioId"
        etiqueta="Beneficiario (quien recibe el dinero)"
        requerido
        :opciones="beneficiarios"
        :error="errores.beneficiarioId"
      />
      <p v-if="!puedeVerTerceros" class="text-sm text-tierra-600 dark:text-tierra-300">
        Su usuario no puede ver los terceros: pida a un administrador el permiso «Ver terceros» para escoger al
        beneficiario.
      </p>
      <BotonBase
        v-else-if="puedeCrearTerceros"
        variante="fantasma"
        pequeno
        :icono="UserPlus"
        @click="$emit('nuevoBeneficiario')"
      >
        No está en la lista: registrarlo
      </BotonBase>
    </div>

    <CampoInterruptor
      v-model="edicion.esEmpleado"
      etiqueta="Es empleado de la empresa"
      descripcion="Si no lo es, las facturas deben venir a nombre y NIT de la empresa. Solo a un empleado se le puede descontar lo no liquidado como renta del trabajo."
    />
    <CampoSelector
      v-if="puedeElegirUsuario"
      v-model="edicion.beneficiarioUsuarioId"
      etiqueta="Usuario de Arrancar del beneficiario"
      :opciones="usuarios"
      :error="errores.beneficiarioUsuarioId"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoSelector
        v-model="edicion.clase"
        etiqueta="Clase"
        requerido
        :opciones="OPCIONES_DE_CLASE"
        :error="errores.clase"
      />
      <CampoTexto
        v-model="edicion.monto"
        etiqueta="Monto del anticipo"
        tipo="number"
        paso="0.01"
        requerido
        :error="errores.monto"
      />
    </div>
    <CampoTexto
      v-model="edicion.descripcion"
      etiqueta="Para qué es"
      requerido
      multilinea
      contar
      :longitud-maxima="MAXIMO_DE_LA_DESCRIPCION"
      :error="errores.descripcion"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha de entrega"
        tipo="date"
        :maximo="hoy"
        requerido
        :error="errores.fecha"
      />
      <CampoTexto
        v-model="edicion.fechaLimite"
        etiqueta="Fecha límite para liquidar"
        tipo="date"
        :ayuda="
          fechaLimitePropuesta
            ? `Si la deja en blanco será el ${formatearFecha(fechaLimitePropuesta)}.`
            : 'Si la deja en blanco se propone según la configuración de la empresa.'
        "
        :error="errores.fechaLimite"
      />
    </div>
    <span v-if="hayVencidos" v-permiso="'cuentas-por-liquidar.anticipos.con-vencidos'" class="contents">
      <CampoTexto
        v-model="edicion.motivoConVencidos"
        etiqueta="Motivo de entregar a quien tiene anticipos vencidos"
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Solo hace falta si la empresa bloquea las entregas a quien tiene vencidos; queda en el anticipo."
        :error="errores.motivoConVencidos"
      />
    </span>

    <CampoSelector v-model="edicion.forma" etiqueta="Cómo se entrega" requerido :opciones="OPCIONES_DE_FORMA" />
    <div class="space-y-2">
      <CampoSelector
        v-model="edicion.medio"
        :etiqueta="esCheque ? 'Chequera' : 'Cuenta bancaria'"
        requerido
        :opciones="opcionesDelMedioElegido"
        :error="errores.medio ?? errores.chequeraId ?? errores.cuentaBancariaId"
      />
      <p v-if="sinMedios" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ esCheque ? 'No hay chequeras activas.' : 'No hay cuentas bancarias activas.' }} Créelas en
        <RouterLink
          :to="esCheque ? '/bancos/chequeras' : '/bancos/cuentas-bancarias'"
          class="font-medium underline underline-offset-2"
          >Bancos</RouterLink
        >
        para poder entregar el anticipo.
      </p>
    </div>
    <CampoInterruptor
      v-if="esCheque"
      v-model="edicion.noNegociable"
      etiqueta="No negociable"
      descripcion="Solo lo cobra quien figura en el cheque, directamente en ventanilla. El cheque va a nombre del beneficiario; no se emite al portador."
    />
    <CampoTexto
      v-else
      v-model="edicion.referencia"
      etiqueta="Número de la transferencia"
      :longitud-maxima="MAXIMO_DE_REFERENCIA"
      ayuda="Opcional, pero conviene anotarla para la conciliación."
      :error="errores.referencia"
    />
  </div>
</template>
