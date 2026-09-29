import { watch, type Ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import {
  apiLibroDeCompras,
  type DatosFiscalesDeEmpresa,
  type DatosFiscalesDeProveedor,
} from '../servicios/libro-de-compras.api';
import {
  fiscalesDeEmpresaDesde,
  fiscalesDeEmpresaPorOmision,
  type FiscalesDeEmpresa,
} from './datos-fiscales-de-empresa';
import {
  fiscalesDeProveedorDesde,
  fiscalesDeProveedorPorOmision,
  type FiscalesDeProveedor,
} from './datos-fiscales-de-proveedor';
import { usarLecturaDeSeccion } from './usar-lectura-de-seccion';

/** Trae los datos fiscales de la empresa que se edita al `v-model` de la sección (o los de omisión si es nueva). */
export function usarFiscalesDeEmpresa(modelo: Ref<FiscalesDeEmpresa | undefined>, registroId: () => string | null) {
  return usarLecturaDeSeccion(modelo, {
    registroId,
    traer: async (id) => fiscalesDeEmpresaDesde(await apiLibroDeCompras.obtenerDatosFiscalesDeEmpresa(id)),
    porOmision: fiscalesDeEmpresaPorOmision,
  });
}

/** Trae los datos fiscales del proveedor que se edita al `v-model` de la sección (o los de omisión si aún no lo es). */
export function usarFiscalesDeProveedor(modelo: Ref<FiscalesDeProveedor | undefined>, registroId: () => string | null) {
  return usarLecturaDeSeccion(modelo, {
    registroId,
    traer: async (id) => fiscalesDeProveedorDesde(await apiLibroDeCompras.obtenerDatosFiscalesDeProveedor(id)),
    porOmision: fiscalesDeProveedorPorOmision,
  });
}

/** Lee los datos fiscales de una empresa para su ficha y los vuelve a leer si cambia la empresa. */
export function usarFichaFiscalDeEmpresa(empresaId: () => string) {
  const carga = usarCarga(
    () => apiLibroDeCompras.obtenerDatosFiscalesDeEmpresa(empresaId()),
    null as DatosFiscalesDeEmpresa | null,
    'No se pudieron cargar los datos fiscales de la empresa.',
  );
  watch(empresaId, carga.cargar);
  return carga;
}

/** Lee los datos fiscales de un proveedor para su ficha y los vuelve a leer si cambia el proveedor. */
export function usarFichaFiscalDeProveedor(proveedorId: () => string) {
  const carga = usarCarga(
    () => apiLibroDeCompras.obtenerDatosFiscalesDeProveedor(proveedorId()),
    null as DatosFiscalesDeProveedor | null,
    'No se pudieron cargar los datos fiscales del proveedor.',
  );
  watch(proveedorId, carga.cargar);
  return carga;
}
