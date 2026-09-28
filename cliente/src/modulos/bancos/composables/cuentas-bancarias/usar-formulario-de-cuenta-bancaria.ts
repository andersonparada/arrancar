import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import {
  apiCuentasBancarias,
  type DatosCuentaBancaria,
  type CuentaBancaria,
} from '../../servicios/cuentas-bancarias.api';
import { datosDeCuentaBancaria, edicionDe } from './edicion-de-cuenta-bancaria';
import { usarReferenciasDeCuentaBancaria } from './referencias-de-cuenta-bancaria';

const guardarCuentaBancaria = (id: string | null, datos: DatosCuentaBancaria) =>
  id ? apiCuentasBancarias.actualizar(id, datos) : apiCuentasBancarias.crear(datos);

/** Registrar una cuenta bancaria o editarla en página completa; sin id es nueva. */
export function usarFormularioDeCuentaBancaria(cuentaBancariaId: string | null) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: edicion, cargando } = usarCarga(
    async () => edicionDe(cuentaBancariaId ? await apiCuentasBancarias.obtener(cuentaBancariaId) : undefined),
    edicionDe(),
    'No se pudo cargar la cuenta bancaria.',
  );
  const referencias = usarReferenciasDeCuentaBancaria();

  /** @returns La cuenta bancaria guardada, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<CuentaBancaria | null> {
    let guardado: CuentaBancaria | null = null;
    const aceptado = await enviar(async () => {
      guardado = await guardarCuentaBancaria(cuentaBancariaId, datosDeCuentaBancaria(edicion.value));
    });
    if (aceptado) avisos.exito(cuentaBancariaId ? 'Cuenta bancaria actualizada.' : 'Cuenta bancaria registrada.');
    return guardado;
  }

  return { edicion, cargando, enviando, errores, referencias, guardar };
}
