<script setup lang="ts">
import { computed } from 'vue';
import { Briefcase, Pencil, ShoppingCart } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import SeccionesEnLaFicha from '@/modulos/core/componentes/SeccionesEnLaFicha.vue';
import ContactosDelTercero from '../componentes/ContactosDelTercero.vue';
import DatosGeneralesDelTercero from '../componentes/DatosGeneralesDelTercero.vue';
import TarjetaDePapel from '../componentes/TarjetaDePapel.vue';
import VentanaDeContacto from '../componentes/VentanaDeContacto.vue';
import VentanaDePapel from '../componentes/VentanaDePapel.vue';
import { usarContactosDelTercero } from '../composables/usar-contactos-del-tercero';
import { usarFichaDeTercero } from '../composables/usar-ficha-de-tercero';
import { usarPapelesDeLaFicha } from '../composables/usar-papeles-de-la-ficha';
import { PERMISOS_DEL_PAPEL, RUTAS_DEL_PAPEL, volverALaLista } from '../papeles';
import type { PapelTercero } from '../servicios/terceros.api';
import { CLASES_DE_CLIENTE } from '../textos';

/** La misma ficha se abre desde Clientes o desde Proveedores; `papel` indica desde dónde. */
const props = defineProps<{ papel: PapelTercero; terceroId: string }>();

const router = useRouter();
const sesion = usarSesion();
const { ficha, categorias, cargar, nombreDeCategoria } = usarFichaDeTercero(props.terceroId);
const contactos = usarContactosDelTercero(props.terceroId, cargar);
const papeles = usarPapelesDeLaFicha(ficha, cargar);
const puedeEditar = sesion.puede('terceros.editar');
const estado = (activo: boolean) => ({ etiqueta: 'Estado', valor: activo ? 'Activo' : 'Inactivo' });

const comoCliente = computed(() => {
  const cliente = ficha.value?.cliente;
  return cliente ? [{ etiqueta: 'Clase', valor: CLASES_DE_CLIENTE[cliente.clase] }, estado(cliente.activo)] : null;
});
const comoProveedor = computed(() => {
  const proveedor = ficha.value?.proveedor;
  if (!proveedor) return null;
  return [{ etiqueta: 'Categoría', valor: nombreDeCategoria(proveedor.categoriaId) }, estado(proveedor.activo)];
});

const editar = () =>
  router.push({ name: `${RUTAS_DEL_PAPEL[props.papel]}.editar`, params: { terceroId: props.terceroId } });
</script>

<template>
  <div v-if="ficha" class="space-y-4">
    <EncabezadoPagina
      :titulo="ficha.nombreMostrar"
      :descripcion="ficha.tipo === 'individual' ? 'Persona individual' : 'Persona jurídica'"
      :volver="volverALaLista(papel)"
    >
      <InsigniaBase v-if="!ficha.activo" tono="rojo">Inactivo</InsigniaBase>
      <BotonBase v-if="puedeEditar" variante="secundario" :icono="Pencil" @click="editar">Editar</BotonBase>
    </EncabezadoPagina>

    <DatosGeneralesDelTercero :ficha="ficha" />
    <ContactosDelTercero
      :contactos="ficha.contactos"
      :puede-agregar="sesion.puede('terceros.crear')"
      :puede-editar="puedeEditar"
      :puede-eliminar="sesion.puede('terceros.eliminar')"
      @agregar="contactos.abrir()"
      @editar="contactos.abrir"
      @eliminar="contactos.eliminar"
    />
    <TarjetaDePapel
      titulo="Cliente"
      :icono="ShoppingCart"
      :detalles="comoCliente"
      :puede-editar="sesion.puede(PERMISOS_DEL_PAPEL.cliente.editar)"
      :puede-quitar="sesion.puede(PERMISOS_DEL_PAPEL.cliente.eliminar)"
      @editar="papeles.abrir('cliente')"
      @quitar="papeles.quitar('cliente')"
    />
    <TarjetaDePapel
      titulo="Proveedor"
      :icono="Briefcase"
      :detalles="comoProveedor"
      :puede-editar="sesion.puede(PERMISOS_DEL_PAPEL.proveedor.editar)"
      :puede-quitar="sesion.puede(PERMISOS_DEL_PAPEL.proveedor.eliminar)"
      @editar="papeles.abrir('proveedor')"
      @quitar="papeles.quitar('proveedor')"
    />
    <SeccionesEnLaFicha v-if="ficha.proveedor" en="proveedor" :registro-id="ficha.proveedor.id" />

    <VentanaDeContacto
      :abierta="contactos.edicion.abierta"
      :es-nuevo="!contactos.edicion.id"
      :inicial="contactos.edicion.datos"
      :errores="contactos.errores.value"
      :enviando="contactos.enviando.value"
      @cerrar="contactos.edicion.abierta = false"
      @guardar="contactos.guardar"
    />
    <VentanaDePapel
      v-model="papeles.edicion.papeles"
      :papel="papeles.edicion.abierta"
      :categorias="categorias"
      :enviando="papeles.enviando.value"
      @cerrar="papeles.edicion.abierta = null"
      @guardar="papeles.guardar"
    />
  </div>
</template>
