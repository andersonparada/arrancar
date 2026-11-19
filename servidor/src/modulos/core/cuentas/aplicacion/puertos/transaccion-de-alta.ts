import type { Rol } from '../../../autorizacion/dominio/rol.js';
import type { AsignadorDeNombreDeUsuario } from '../../../identidad/aplicacion/asignador-de-nombre-de-usuario.js';
import type { RepositorioUsuarios } from '../../../identidad/aplicacion/puertos/repositorio-usuarios.js';
import type { RepositorioCuentas } from './repositorio-cuentas.js';

export interface AccesoDelPropietario {
  cuentaId: string;
  empresaId: string;
  usuarioId: string;
  rolId: string;
}

/** La primera empresa de la cuenta y el acceso de su dueño. */
export interface EmpresaInicial {
  registrar(cuentaId: string, datos: { nombre: string; nit: string | null }): Promise<{ id: string; nombre: string }>;
  darAccesoAlPropietario(acceso: AccesoDelPropietario): Promise<void>;
}

/** Todo lo que el alta escribe, atado a una misma transacción. */
export interface PiezasDeAlta {
  cuentas: RepositorioCuentas;
  empresa: EmpresaInicial;
  roles: { agregar(rol: Rol): Promise<void> };
  usuarios: RepositorioUsuarios;
  asignador: AsignadorDeNombreDeUsuario;
}

/** Quién da de alta y qué cuenta nace: la transacción fija ambos para que la RLS y la autoría los reconozcan. */
export interface OrigenDelAlta {
  cuentaId: string;
  /** El usuario de soporte que da de alta; nulo si lo hace la siembra, sin usuario. */
  usuarioId: string | null;
}

/**
 * El alta no cabe en la unidad de trabajo: esta exige una empresa y la empresa
 * aún no existe. Si algo falla, no queda nada a medias.
 */
export interface TransaccionDeAlta {
  ejecutar<Resultado>(origen: OrigenDelAlta, trabajo: (piezas: PiezasDeAlta) => Promise<Resultado>): Promise<Resultado>;
}
