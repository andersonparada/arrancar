<script setup lang="ts">
import { Pencil, Power, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import DatosDeLaParcela from '../componentes/parcelas/DatosDeLaParcela.vue';
import InmueblesDeLaParcela from '../componentes/parcelas/InmueblesDeLaParcela.vue';
import PestanasDeParcela from '../componentes/parcelas/PestanasDeParcela.vue';
import MedicionesDeLaParcela from '../componentes/mediciones/MedicionesDeLaParcela.vue';
import VentanaDeAnulacionDeMedicion from '../componentes/mediciones/VentanaDeAnulacionDeMedicion.vue';
import VentanaDeMedicion from '../componentes/mediciones/VentanaDeMedicion.vue';
import { PESTANAS_DE_PARCELA, usarFichaDeParcela } from '../composables/parcelas/usar-ficha-de-parcela';
import { VENTANAS_PARCELAS } from '../textos';

const props = defineProps<{ parcelaId: string }>();

const ventana = VENTANAS_PARCELAS.parcelas;
const ficha = usarFichaDeParcela(props.parcelaId);
const { registro, cargando, pestana, mediciones } = ficha;
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'parcelas.parcelas' } };
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina
      :titulo="`${registro.codigo} · ${registro.nombre}`"
      :descripcion="registro.localidadNombre"
      :volver="volver"
    >
      <InsigniaBase v-if="!registro.activo" tono="rojo">Inactiva</InsigniaBase>
      <BotonBase v-permiso="'parcelas.parcelas.editar'" variante="secundario" :icono="Pencil" @click="ficha.editar">
        Editar
      </BotonBase>
      <BotonBase
        v-permiso="'parcelas.parcelas.editar'"
        variante="secundario"
        :icono="Power"
        @click="ficha.cambiarEstado"
      >
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
      <BotonBase v-permiso="'parcelas.parcelas.eliminar'" variante="fantasma" :icono="Trash2" @click="ficha.eliminar">
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <PestanasDeParcela v-model="pestana" :pestanas="PESTANAS_DE_PARCELA" />
    <div id="panel-de-la-parcela" role="tabpanel" :aria-labelledby="`pestana-de-parcela-${pestana}`" tabindex="0">
      <DatosDeLaParcela
        v-if="pestana === 'datos'"
        :parcela="registro"
        :subparcelas="ficha.subparcelas.value"
        :mostrar="ficha.mostrar"
        @nueva-subparcela="ficha.nuevaSubparcela"
      />
      <MedicionesDeLaParcela
        v-else-if="pestana === 'mediciones'"
        :mediciones="registro.mediciones"
        :mostrar="ficha.mostrar"
        @registrar="mediciones.abrir"
        @anular="mediciones.pedirAnulacion"
      />
      <InmueblesDeLaParcela v-else :inmuebles="registro.inmuebles" :mostrar="ficha.mostrar" @editar="ficha.editar" />
    </div>

    <VentanaDeMedicion
      v-model="mediciones.edicion.value"
      :errores="mediciones.errores.value"
      :enviando="mediciones.enviando.value"
      :ajustes="mediciones.ajustes.value"
      @cerrar="mediciones.edicion.value.abierta = false"
      @guardar="mediciones.guardar"
    />
    <VentanaDeAnulacionDeMedicion
      v-model="mediciones.anulacion.value"
      :errores="mediciones.erroresDeAnulacion.value"
      :enviando="mediciones.anulandoEnviando.value"
      @cerrar="mediciones.anulacion.value.abierta = false"
      @anular="mediciones.anular"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500" role="status">Cargando…</p>
</template>
