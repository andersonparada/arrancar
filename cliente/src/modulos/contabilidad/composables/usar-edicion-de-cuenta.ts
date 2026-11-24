import { reactive, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentas, type Cuenta, type DatosDeCuenta } from '../servicios/cuentas.api';
import type { RolDeEnlace } from '../servicios/enlaces.api';
import { cuentaNueva, datosDeLaCuenta, datosParaEnviar } from './edicion-de-cuenta';
import { rolesDeAuxiliarDeLaCuenta } from './edicion-de-enlaces';

/** Lo que la edición necesita saber de la pantalla. */
export interface EntornoDeEdicion {
  cuentas: Readonly<Ref<Cuenta[]>>;
  mascara: Readonly<Ref<string>>;
  roles: Readonly<Ref<RolDeEnlace[]>>;
  /** Se llama con la cuenta superior de la cuenta guardada (o `null`) para recargar y abrir el camino. */
  alGuardar: (padreId: string | null) => Promise<void>;
}

export interface EstadoDeEdicion {
  abierta: boolean;
  existente: Cuenta | null;
  padre: Cuenta | null;
  datos: DatosDeCuenta;
}

type Avisos = ReturnType<typeof usarAvisos>;

/** El estado de la ventana y cómo se abre: para una cuenta nueva (bajo una superior) o para editar una. */
function usarVentana(entorno: EntornoDeEdicion, alAbrir: () => void) {
  const edicion = reactive<EstadoDeEdicion>({
    abierta: false,
    existente: null,
    padre: null,
    datos: cuentaNueva([], null, ''),
  });

  function abrirNueva(padre: Cuenta | null): void {
    alAbrir();
    const datos = cuentaNueva(entorno.cuentas.value, padre, entorno.mascara.value);
    Object.assign(edicion, { abierta: true, existente: null, padre, datos });
  }

  function abrirEdicion(cuenta: Cuenta): void {
    alAbrir();
    const padre = entorno.cuentas.value.find((otra) => otra.id === cuenta.padreId) ?? null;
    Object.assign(edicion, { abierta: true, existente: cuenta, padre, datos: datosDeLaCuenta(cuenta) });
  }

  return { edicion, abrirNueva, abrirEdicion };
}

/** Quitarle la marca de control a una cuenta que lleva el detalle de un auxiliar la deja sin su control. */
async function confirmarFinDeControl(avisos: Avisos, edicion: EstadoDeEdicion, roles: RolDeEnlace[]) {
  const { existente, datos } = edicion;
  if (!existente?.esDeControl || datos.esDeControl) return true;
  const deAuxiliar = rolesDeAuxiliarDeLaCuenta(roles, existente.id);
  if (deAuxiliar.length === 0) return true;
  return avisos.confirmar({
    titulo: 'Quitar la marca de cuenta de control',
    mensaje: `Esta cuenta lleva el detalle de: ${deAuxiliar.join(', ')}. Sin la marca, los movimientos manuales podrán afectarla y dejar de cuadrar con su auxiliar. ¿Quitarla de todos modos?`,
    textoConfirmar: 'Quitar la marca',
    peligroso: true,
  });
}

const confirmarEliminacion = (avisos: Avisos, cuenta: Cuenta): Promise<boolean> =>
  avisos.confirmar({
    titulo: 'Eliminar cuenta',
    mensaje: `Se eliminará la cuenta ${cuenta.codigo} ${cuenta.nombre}. Solo se puede si no tiene movimientos, cuentas inferiores ni enlaces; si ya se usó, inactívela en su lugar.`,
    textoConfirmar: 'Eliminar',
    peligroso: true,
  });

/** Ventana de una cuenta: crearla o editarla, con las confirmaciones que pide cada caso. */
export function usarEdicionDeCuenta(entorno: EntornoDeEdicion) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { edicion, abrirNueva, abrirEdicion } = usarVentana(entorno, () => (errores.value = {}));

  async function guardar(): Promise<void> {
    if (!(await confirmarFinDeControl(avisos, edicion, entorno.roles.value))) return;
    const { existente, datos } = edicion;
    const cuerpo = datosParaEnviar(datos);
    const accion = () => (existente ? apiCuentas.actualizar(existente.id, cuerpo) : apiCuentas.crear(cuerpo));
    if (!(await enviar(accion))) return;
    edicion.abierta = false;
    avisos.exito(existente ? 'Cuenta guardada.' : `Cuenta ${cuerpo.codigo} creada.`);
    await entorno.alGuardar(edicion.padre?.id ?? null);
  }

  async function eliminar(): Promise<void> {
    const { existente } = edicion;
    if (!existente || !(await confirmarEliminacion(avisos, existente))) return;
    if (!(await enviar(() => apiCuentas.eliminar(existente.id)))) return;
    edicion.abierta = false;
    avisos.exito(`Cuenta ${existente.codigo} eliminada.`);
    await entorno.alGuardar(existente.padreId);
  }

  return { edicion, enviando, errores, abrirNueva, abrirEdicion, guardar, eliminar };
}
