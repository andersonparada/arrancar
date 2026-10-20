<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import SeccionesEnLaFicha from '@/modulos/core/componentes/SeccionesEnLaFicha.vue';
import VentanaDeEmpresa from '../componentes/VentanaDeEmpresa.vue';
import { usarFichaDeEmpresa } from '../composables/usar-ficha-de-empresa';

const props = defineProps<{ empresaId: string }>();
const {
  empresa,
  detalles,
  edicion,
  enviando,
  errores,
  abrir,
  guardar,
  carga,
  motivo,
  reaperturaAbierta,
  enviandoCierre,
  erroresDeReapertura,
  enviandoReapertura,
  cerrar,
  abrirReapertura,
  reabrir,
} = usarFichaDeEmpresa(props.empresaId);
const volver = { texto: 'Empresas', ruta: '/empresas' };
</script>

<template>
  <div v-if="empresa" class="space-y-4">
    <EncabezadoPagina :titulo="empresa.nombre" descripcion="Datos de la empresa" :volver="volver">
      <InsigniaBase v-if="!empresa.activa" tono="rojo">Desactivada</InsigniaBase>
      <BotonBase v-permiso="'empresas.editar'" variante="secundario" :icono="Pencil" @click="abrir(empresa)">
        Editar
      </BotonBase>
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detalles" />
    <SeccionesEnLaFicha en="empresa" :registro-id="empresa.id" />

    <VentanaDeEmpresa
      v-model="edicion"
      v-model:motivo="motivo"
      :errores="errores"
      :enviando="enviando"
      :carga="carga"
      :enviando-cierre="enviandoCierre"
      :errores-de-reapertura="erroresDeReapertura"
      :enviando-reapertura="enviandoReapertura"
      :reapertura-abierta="reaperturaAbierta"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
      @cerrar-carga="cerrar"
      @abrir-reapertura="abrirReapertura"
      @cancelar-reapertura="reaperturaAbierta = false"
      @reabrir="reabrir"
    />
  </div>
  <p v-else class="text-sm text-tierra-500" role="status">Cargando la empresa…</p>
</template>
