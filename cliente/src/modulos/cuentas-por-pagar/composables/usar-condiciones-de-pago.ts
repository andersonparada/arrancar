import { computed, ref, watch, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarLecturaDeSeccion } from '@/modulos/core/composables/usar-lectura-de-seccion';
import {
  apiCuentasPorPagar,
  type CondicionesConPlazoPorOmision,
  type CondicionesDeProveedor,
  type SaldoDelProveedor,
} from '../servicios/cuentas-por-pagar.api';
import { condicionesPorOmision, diasDesdeTexto, textoDeDias } from './condiciones-de-pago';

const PERMISO_PARA_VER_EL_SALDO = 'cuentas-por-pagar.documentos.ver';

/** Trae las condiciones del proveedor al `v-model` de la sección del formulario (o las de omisión si es nuevo). */
export function usarCondicionesDePago(
  modelo: Ref<CondicionesDeProveedor | undefined>,
  registroId: () => string | null,
) {
  /** Meses del plazo por omisión de la empresa; sin saberse (proveedor nuevo o lectura fallida) es `null`. */
  const mesesPorOmision = ref<number | null>(null);
  const lectura = usarLecturaDeSeccion(modelo, {
    registroId,
    traer: async (id) => {
      const { mesesPorOmision: meses, ...condiciones } = await apiCuentasPorPagar.obtenerCondiciones(id);
      mesesPorOmision.value = meses;
      return { diasDeCredito: condiciones.diasDeCredito, contarDesdeLaRecepcion: condiciones.contarDesdeLaRecepcion };
    },
    porOmision: condicionesPorOmision,
  });
  /** El campo de días trabaja con texto: vacío es el plazo por omisión. */
  const dias = computed({
    get: () => (modelo.value ? textoDeDias(modelo.value.diasDeCredito) : ''),
    set: (texto: string | number | null) => {
      if (modelo.value) modelo.value = { ...modelo.value, diasDeCredito: diasDesdeTexto(texto) };
    },
  });
  return { ...lectura, dias, mesesPorOmision };
}

interface CondicionesYSaldo {
  condiciones: CondicionesConPlazoPorOmision;
  saldo: SaldoDelProveedor | null;
}

/** Lee el plazo del proveedor y, si el usuario puede ver documentos por pagar, lo que se le debe con la empresa activa. */
export function usarFichaDeCondiciones(proveedorId: () => string) {
  const { puede } = usarSesion();
  const carga = usarCarga<CondicionesYSaldo | null>(
    async () => {
      const id = proveedorId();
      const [condiciones, saldo] = await Promise.all([
        apiCuentasPorPagar.obtenerCondiciones(id),
        puede(PERMISO_PARA_VER_EL_SALDO) ? apiCuentasPorPagar.obtenerSaldoDelProveedor(id) : null,
      ]);
      return { condiciones, saldo };
    },
    null,
    'No se pudieron cargar las condiciones de pago del proveedor.',
  );
  watch(proveedorId, carga.cargar);
  return carga;
}
