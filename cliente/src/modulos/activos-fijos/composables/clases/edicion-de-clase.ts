import { numeroONulo, textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosClase, Clase } from '../../servicios/clases.api';

export const OPCIONES_DE_INCISO_FISCAL = {
  edificios: 'Edificios y construcciones (inciso 1)',
  plantaciones: 'Plantaciones productivas (inciso 2)',
  instalaciones_y_mobiliario: 'Instalaciones y mobiliario (inciso 3)',
  maquinaria_y_vehiculos: 'Maquinaria, vehículos y semovientes de trabajo (inciso 4)',
  computo: 'Equipo de cómputo (inciso 5)',
  herramientas: 'Herramientas (inciso 6)',
  reproductores: 'Reproductores (inciso 7)',
  otros_muebles: 'Otros bienes muebles (inciso 8)',
  intangibles: 'Intangibles (art. 33)',
  llave: 'Derecho de llave (art. 33)',
  terrenos: 'Terrenos (no se deprecian)',
};

/** Lo que muestra cada campo de la ventana mientras se edita una clase de activo. */
export interface EdicionDeClase {
  abierta: boolean;
  id: string | null;
  nombre: string;
  incisoFiscal:
    | 'edificios'
    | 'plantaciones'
    | 'instalaciones_y_mobiliario'
    | 'maquinaria_y_vehiculos'
    | 'computo'
    | 'herramientas'
    | 'reproductores'
    | 'otros_muebles'
    | 'intangibles'
    | 'llave'
    | 'terrenos';
  porcentajeFiscal: string | number;
  vidaUtilContableMeses: string | number;
  valorResidualPorcentaje: string | number;
  activo: boolean;
}

const CLASE_NUEVO: Omit<EdicionDeClase, 'abierta' | 'id'> = {
  nombre: '',
  incisoFiscal: 'edificios',
  porcentajeFiscal: '',
  vidaUtilContableMeses: '',
  valorResidualPorcentaje: '0',
  activo: true,
};

/** La ventana abierta con los datos de la clase de activo, o vacía si es nuevo. */
export function edicionDe(clase?: Clase): EdicionDeClase {
  if (!clase) return { abierta: true, id: null, ...CLASE_NUEVO };
  return {
    abierta: true,
    id: clase.id,
    nombre: textoDeEdicion(clase.nombre),
    incisoFiscal: clase.incisoFiscal,
    porcentajeFiscal: textoDeEdicion(clase.porcentajeFiscal),
    vidaUtilContableMeses: textoDeEdicion(clase.vidaUtilContableMeses),
    valorResidualPorcentaje: textoDeEdicion(clase.valorResidualPorcentaje),
    activo: clase.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeClase = (edicion: EdicionDeClase): DatosClase => ({
  nombre: edicion.nombre,
  incisoFiscal: edicion.incisoFiscal,
  porcentajeFiscal: textoDeEdicion(edicion.porcentajeFiscal),
  vidaUtilContableMeses: numeroONulo(edicion.vidaUtilContableMeses),
  valorResidualPorcentaje: textoDeEdicion(edicion.valorResidualPorcentaje),
  activo: edicion.activo,
});
