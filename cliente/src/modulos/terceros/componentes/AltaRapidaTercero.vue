<script setup lang="ts">
import { reactive, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { tercerosApi, type Tercero, type TipoTercero } from '../servicios/terceros.api';

/**
 * Ventana reutilizable para crear un tercero desde otro módulo (por ejemplo, al
 * registrar una venta) sin salir de la pantalla. Solo pide el nombre; los demás
 * datos se completan después desde la ficha.
 */
const props = defineProps<{ abierta: boolean }>();
const emit = defineEmits<{ cerrar: []; creado: [tercero: Tercero] }>();

const avisos = usarAvisos();
const formulario = usarFormulario();

const datos = reactive({
  tipo: 'individual' as TipoTercero,
  nombres: '',
  apellidos: '',
  razonSocial: '',
});

watch(
  () => props.abierta,
  (abierta) => {
    if (!abierta) return;
    datos.tipo = 'individual';
    datos.nombres = '';
    datos.apellidos = '';
    datos.razonSocial = '';
    formulario.errores.value = {};
  },
);

async function guardar(confirmarDuplicado = false): Promise<void> {
  const cuerpo = {
    tipo: datos.tipo,
    nombres: datos.tipo === 'individual' ? datos.nombres : null,
    apellidos: datos.tipo === 'individual' ? datos.apellidos : null,
    razonSocial: datos.tipo === 'juridica' ? datos.razonSocial : null,
    nombreComercial: null,
    nit: null,
    dpi: null,
    telefono: null,
    whatsapp: null,
    correo: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    fotoArchivoId: null,
    notas: null,
    activo: true,
    confirmarDuplicado,
  };

  let tercero: Tercero | undefined;
  const exito = await formulario.enviar(async () => {
    try {
      tercero = await tercerosApi.crear(cuerpo);
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === 'conflicto') {
        const confirmado = window.confirm(`${error.message}\n\n¿Desea crearlo de todas formas?`);
        if (confirmado) {
          tercero = await tercerosApi.crear({ ...cuerpo, confirmarDuplicado: true });
          return;
        }
      }
      throw error;
    }
  });
  if (!exito || !tercero) return;

  avisos.exito('Registrado.');
  emit('creado', tercero);
}
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Nuevo cliente o proveedor" @cerrar="emit('cerrar')">
    <form id="form-alta-rapida-tercero" class="space-y-4" @submit.prevent="guardar()">
      <CampoSelector
        v-model="datos.tipo"
        etiqueta="Tipo"
        :opciones="[
          { valor: 'individual', texto: 'Persona individual' },
          { valor: 'juridica', texto: 'Persona jurídica (empresa)' },
        ]"
      />
      <template v-if="datos.tipo === 'individual'">
        <CampoTexto v-model="datos.nombres" etiqueta="Nombres" requerido :error="formulario.errores.value.nombres" />
        <CampoTexto v-model="datos.apellidos" etiqueta="Apellidos" :error="formulario.errores.value.apellidos" />
      </template>
      <CampoTexto
        v-else
        v-model="datos.razonSocial"
        etiqueta="Razón social"
        requerido
        :error="formulario.errores.value.razonSocial"
      />
      <p class="text-sm text-tierra-500">
        El NIT, el DPI, el teléfono y los papeles se completan después, desde la ficha.
      </p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-alta-rapida-tercero" :cargando="formulario.enviando.value">Crear</BotonBase>
    </template>
  </VentanaModal>
</template>
