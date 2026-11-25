<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeApertura } from '../composables/fondos/edicion-de-fondo';
import { opcionesDeLocalidades } from '../composables/fondos/opciones-de-fondos';
import type {
  ChequeraParaElFondo,
  CuentaParaElFondo,
  LocalidadParaElFondo,
  UsuarioParaElFondo,
} from '../servicios/catalogos.api';
import { avisoDelTope } from '../composables/fondos/aviso-del-tope';
import { AYUDA_DEL_TOPE } from '../textos';
import CamposDeEntrega from './CamposDeEntrega.vue';
import CamposDelCustodio from './CamposDelCustodio.vue';

/** Abrir un fondo: sus datos, quién lo custodia y cómo sale el dinero del banco. Todo en una sola ventana. */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  cargando: boolean;
  errores: Record<string, string>;
  chequeras: readonly ChequeraParaElFondo[];
  cuentas: readonly CuentaParaElFondo[];
  localidades: readonly LocalidadParaElFondo[];
  usuarios: readonly UsuarioParaElFondo[];
}>();
const edicion = defineModel<EdicionDeApertura>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opcionesDeLocalidad = computed(() => opcionesDeLocalidades(props.localidades, 'Sin localidad'));
const propuesto = computed(
  () => props.usuarios.find((u) => u.id === edicion.value.custodioUsuarioId)?.nombre ?? edicion.value.custodio,
);
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Abrir fondo de caja chica" ancha @cerrar="emit('cerrar')">
    <form id="form-de-apertura" class="space-y-6" novalidate @submit.prevent="emit('guardar')">
      <section class="space-y-4" aria-labelledby="titulo-datos">
        <h3 id="titulo-datos" class="font-semibold">El fondo</h3>
        <CampoTexto
          v-model="edicion.nombre"
          etiqueta="Nombre"
          requerido
          :longitud-maxima="80"
          :error="errores.nombre"
        />
        <CampoSelector
          v-if="localidades.length > 0"
          v-model="edicion.localidadId"
          etiqueta="Localidad"
          :opciones="opcionesDeLocalidad"
          :error="errores.localidadId"
        />
        <CamposDelCustodio
          v-model:custodio="edicion.custodio"
          v-model:usuario-id="edicion.custodioUsuarioId"
          :usuarios="usuarios"
          :errores="errores"
        />
        <CampoTexto
          v-model="edicion.tope"
          etiqueta="Tope por comprobante"
          tipo="number"
          paso="any"
          :ayuda="AYUDA_DEL_TOPE"
          :error="errores.topePorComprobante"
        />
        <p
          v-if="avisoDelTope(edicion.tope, edicion.monto)"
          class="text-sm text-tierra-700 dark:text-trigo-300"
          role="status"
        >
          {{ avisoDelTope(edicion.tope, edicion.monto) }}
        </p>
      </section>
      <section class="space-y-4" aria-labelledby="titulo-dinero">
        <h3 id="titulo-dinero" class="font-semibold">El dinero del fondo</h3>
        <CamposDeEntrega
          v-model="edicion"
          :chequeras="chequeras"
          :cuentas="cuentas"
          :cargando="cargando"
          :errores="errores"
          :beneficiario-propuesto="propuesto"
        />
      </section>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-apertura" :cargando="enviando">Abrir fondo</BotonBase>
    </template>
  </VentanaModal>
</template>
