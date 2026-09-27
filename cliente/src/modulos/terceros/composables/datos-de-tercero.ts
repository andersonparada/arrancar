import type {
  DatosAltaTercero,
  DatosContacto,
  DatosTercero,
  FichaTercero,
  PapelDeCliente,
  PapelDeProveedor,
  PapelTercero,
} from '../servicios/terceros.api';

/** Un cliente o proveedor sin nada escrito: solo el tipo y activo. */
export function datosVacios(): DatosTercero {
  return {
    tipo: 'individual',
    nombres: null,
    apellidos: null,
    razonSocial: null,
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
  };
}

/** Los datos generales de la ficha, listos para editarlos. */
export function datosDeLaFicha(ficha: FichaTercero): DatosTercero {
  const {
    id: _id,
    nombreMostrar: _nombre,
    actualizadoEn: _fecha,
    contactos: _c,
    cliente: _cl,
    proveedor: _p,
    ...datos
  } = ficha;
  return datos;
}

export function contactoVacio(): DatosContacto {
  return { nombre: '', cargo: null, telefono: null, whatsapp: null, correo: null, notas: null };
}

export interface PapelesDelFormulario {
  cliente: PapelDeCliente;
  proveedor: PapelDeProveedor;
}

export function papelesVacios(): PapelesDelFormulario {
  return {
    cliente: { clase: 'directo', activo: true, notas: null },
    proveedor: { categoriaId: null, activo: true, notas: null },
  };
}

/** Lo que se envía al registrar desde Clientes o Proveedores: entra con ese papel. */
export function altaCompleta(
  datos: DatosTercero,
  papel: PapelTercero,
  { papeles, contactos }: { papeles: PapelesDelFormulario; contactos: DatosContacto[] },
): DatosAltaTercero {
  const papelAlRegistrar =
    papel === 'cliente' ? { tipo: papel, ...papeles.cliente } : { tipo: papel, ...papeles.proveedor };
  const conNombre = contactos.filter((contacto) => contacto.nombre.trim());
  return { ...datos, papel: papelAlRegistrar, contactos: conNombre };
}
