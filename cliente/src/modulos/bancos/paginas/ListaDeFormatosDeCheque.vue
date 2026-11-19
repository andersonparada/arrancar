<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import VentanaDeMotivo from '../componentes/VentanaDeMotivo.vue';
import TarjetaDeFormatoDeCheque from '../componentes/formatos-de-cheque/TarjetaDeFormatoDeCheque.vue';
import TarjetaDePlantillaDeCheque from '../componentes/formatos-de-cheque/TarjetaDePlantillaDeCheque.vue';
import VentanaDeFormatoDeCheque from '../componentes/formatos-de-cheque/VentanaDeFormatoDeCheque.vue';
import { usarFormatosDeCheque } from '../composables/formatos-de-cheque/usar-formatos-de-cheque';
import { VENTANAS_BANCOS } from '../textos';

const ventana = VENTANAS_BANCOS.formatosDeCheque;
const {
  registros,
  plantillas,
  cargando,
  edicion,
  enviando,
  errores,
  problemas,
  nuevo,
  abrir,
  cambiarBase,
  guardar,
  eliminacion,
  cambiarEstado,
} = usarFormatosDeCheque();
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase v-permiso="'bancos.formatos-de-cheque.crear'" :icono="Plus" @click="nuevo()">
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <p v-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="!registros.length"
      :icono="Inbox"
      titulo="Todavía no hay formatos"
      descripcion="Elija una plantilla de fábrica abajo, haga su prueba de alineación en una hoja en blanco y ajuste las medidas a su formulario."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="registro in registros" :key="registro.id">
        <TarjetaDeFormatoDeCheque
          :registro="registro"
          :plantillas="plantillas"
          @editar="abrir(registro)"
          @eliminar="eliminacion.abrir(registro)"
          @cambiar-estado="cambiarEstado(registro)"
        />
      </li>
    </ul>

    <h2 class="mt-8 mb-1 text-lg font-semibold">Plantillas de fábrica</h2>
    <p class="mb-3 text-sm text-tierra-600 dark:text-tierra-300">
      Medidas aproximadas de un cheque guatemalteco común. Las chequeras también pueden usar una plantilla sin crear un
      formato.
    </p>
    <ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="plantilla in plantillas" :key="plantilla.clave">
        <TarjetaDePlantillaDeCheque :plantilla="plantilla" @crear="nuevo(plantilla.clave)" />
      </li>
    </ul>

    <VentanaDeFormatoDeCheque
      v-model="edicion"
      :errores="errores"
      :problemas="problemas"
      :enviando="enviando"
      :plantillas="plantillas"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
      @cambiar-base="cambiarBase"
    />
    <VentanaDeMotivo
      v-model:motivo="eliminacion.motivo"
      :abierta="!!eliminacion.registro"
      titulo="Eliminar formato"
      accion="Eliminar"
      :texto="`¿Eliminar el formato «${eliminacion.registro?.nombre ?? ''}»? Solo se puede si ninguna chequera lo usa; si alguna lo usa, inactívelo. Queda en la auditoría.`"
      :errores="eliminacion.errores"
      :enviando="eliminacion.enviando"
      @cerrar="eliminacion.cerrar"
      @confirmar="eliminacion.confirmar"
    />
  </div>
</template>
