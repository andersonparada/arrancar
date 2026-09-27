import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';

export const CONTRASENA_DE_PRUEBA = 'contrasena-de-prueba';

export interface CuentaDePrueba {
  cuentaId: string;
  empresaId: string;
  usuario: string;
  /** Navegador del propietario, con la sesión iniciada y la empresa activa. */
  propietario: ClienteApi;
}

interface DatosCuenta {
  nombre: string;
  usuario: string;
  modulos?: string[];
}

interface DatosUsuario {
  nombres: string;
  apellidos: string;
  permisos: string[];
}

/** Da de alta una cuenta desde soporte e inicia sesión con su propietario. */
export async function darDeAltaCuenta(entorno: EntornoApi, datos: DatosCuenta): Promise<CuentaDePrueba> {
  const alta = await entorno.soporte.post('/api/plataforma/cuentas', {
    nombreCuenta: datos.nombre,
    empresa: { nombre: `Rancho de ${datos.nombre}` },
    propietario: { nombres: 'Dueño', apellidos: datos.nombre, usuario: datos.usuario, contrasena: CONTRASENA_DE_PRUEBA },
    modulos: datos.modulos ?? [],
  });
  expect(alta.estado).toBe(201);

  const propietario = entorno.nuevoCliente();
  await propietario.iniciarSesion(datos.usuario, CONTRASENA_DE_PRUEBA);
  await propietario.get('/api/sesion');
  return { cuentaId: alta.cuerpo.cuenta.id, empresaId: alta.cuerpo.empresa.id, usuario: datos.usuario, propietario };
}

/**
 * Crea en la cuenta un rol con los permisos indicados y un usuario con ese rol;
 * devuelve su navegador con la sesión iniciada.
 */
export async function crearUsuarioConPermisos(
  entorno: EntornoApi,
  cuenta: CuentaDePrueba,
  datos: DatosUsuario,
): Promise<ClienteApi> {
  const rol = await cuenta.propietario.post('/api/roles', { nombre: `Rol de ${datos.nombres}`, permisos: datos.permisos });
  expect(rol.estado).toBe(201);

  const creado = await cuenta.propietario.post('/api/usuarios', {
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    contrasena: CONTRASENA_DE_PRUEBA,
    accesos: [{ empresaId: cuenta.empresaId, rolId: rol.cuerpo.id }],
  });
  expect(creado.estado).toBe(201);

  const usuario = entorno.nuevoCliente();
  await usuario.iniciarSesion(creado.cuerpo.usuario, CONTRASENA_DE_PRUEBA);
  await usuario.get('/api/sesion');
  return usuario;
}
