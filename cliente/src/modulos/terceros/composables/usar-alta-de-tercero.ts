import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTerceros, type DatosTercero, type Tercero, type TipoTercero } from '../servicios/terceros.api';
import { conConfirmacionDeDuplicado, DESISTIO } from './confirmar-duplicado';
import { datosVacios } from './datos-de-tercero';

/** Lo mínimo para registrar a alguien; lo demás se completa en la ficha. */
export interface DatosMinimosDeTercero {
  tipo: TipoTercero;
  nombres: string;
  apellidos: string;
  razonSocial: string;
}

function solicitudDe({ tipo, nombres, apellidos, razonSocial }: DatosMinimosDeTercero): DatosTercero {
  const esPersona = tipo === 'individual';
  return {
    ...datosVacios(),
    tipo,
    nombres: esPersona ? nombres : null,
    apellidos: esPersona ? apellidos : null,
    razonSocial: esPersona ? null : razonSocial,
  };
}

/** Registrar un cliente o proveedor desde cualquier pantalla sin salir de ella (por ejemplo, al vender). */
export function usarAltaDeTercero() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  /** @returns el tercero creado, o `undefined` si hubo errores o el usuario desistió. */
  async function crear(datos: DatosMinimosDeTercero): Promise<Tercero | undefined> {
    const solicitud = solicitudDe(datos);
    let resultado: Tercero | typeof DESISTIO = DESISTIO;
    const exito = await enviar(async () => {
      resultado = await conConfirmacionDeDuplicado((confirmarDuplicado) =>
        apiTerceros.crear({ ...solicitud, confirmarDuplicado }),
      );
    });
    if (!exito || resultado === DESISTIO) return undefined;
    avisos.exito('Registrado.');
    return resultado;
  }

  return { enviando, errores, crear };
}
