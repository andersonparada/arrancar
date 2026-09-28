<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { detallesDeCuentaBancaria } from '../composables/cuentas-bancarias/detalles-de-cuenta-bancaria';
import { usarFichaDeCuentaBancaria } from '../composables/cuentas-bancarias/usar-ficha-de-cuenta-bancaria';
import { VENTANAS_BANCOS } from '../textos';

const props = defineProps<{ cuentaBancariaId: string }>();

const ventana = VENTANAS_BANCOS.cuentasBancarias;
const { registro, cargando, editar } = usarFichaDeCuentaBancaria(props.cuentaBancariaId);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'bancos.cuentas-bancarias' } };
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina :titulo="String(registro.nombre)" descripcion="Cuenta bancaria" :volver="volver">
      <InsigniaBase v-if="!registro.activo" tono="rojo">Inactivo</InsigniaBase>
      <BotonBase v-permiso="'bancos.cuentas-bancarias.gestionar'" variante="secundario" :icono="Pencil" @click="editar">
        Editar
      </BotonBase>
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detallesDeCuentaBancaria(registro)" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
</template>
