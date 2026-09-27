import type { DatosEmpresa, Empresa } from '../servicios/empresas.api';

export interface EdicionDeEmpresa {
  abierta: boolean;
  empresaId: string | null;
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  correo: string;
  activa: boolean;
}

const EMPRESA_NUEVA = { empresaId: null, nombre: '', nit: '', direccion: '', telefono: '', correo: '', activa: true };

const datosDe = (empresa: Empresa) => ({
  empresaId: empresa.id,
  nombre: empresa.nombre,
  nit: empresa.nit ?? '',
  direccion: empresa.direccion ?? '',
  telefono: empresa.telefono ?? '',
  correo: empresa.correo ?? '',
  activa: empresa.activa,
});

/** La ventana abierta con los datos de la empresa, o vacía si es nueva. */
export const edicionDe = (empresa?: Empresa): EdicionDeEmpresa => ({
  ...(empresa ? datosDe(empresa) : EMPRESA_NUEVA),
  abierta: true,
});

/** Lo que queda vacío se guarda como nada. */
export const datosDeLaEmpresa = (edicion: EdicionDeEmpresa): DatosEmpresa => ({
  nombre: edicion.nombre,
  nit: edicion.nit || null,
  direccion: edicion.direccion || null,
  telefono: edicion.telefono || null,
  correo: edicion.correo || null,
  activa: edicion.activa,
});
