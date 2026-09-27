import type { NivelEditable, VariableConfiguracion } from '../../servicios/configuracion.api';

export const NOMBRES_DEL_ORIGEN = {
  predeterminado: 'Predeterminado',
  instalacion: 'Servidor',
  cuenta: 'Cuenta',
  empresa: 'Empresa',
} as const;

/** El servidor se configura en su archivo; desde la pantalla solo se cambian cuenta y empresa. */
export const nivelesEditables = (variable: VariableConfiguracion) =>
  variable.niveles.filter((nivel): nivel is NivelEditable => nivel === 'cuenta' || nivel === 'empresa');

/** Cada nivel de cada variable tiene su borrador: `clave:nivel`. */
export const llaveDelBorrador = (variable: VariableConfiguracion, nivel: NivelEditable) => `${variable.clave}:${nivel}`;

/** Lo que el usuario ve antes de editar: el valor guardado en cada nivel, o nada si lo hereda. */
export const borradoresDe = (variables: VariableConfiguracion[]): Record<string, unknown> =>
  Object.fromEntries(
    variables.flatMap((variable) =>
      nivelesEditables(variable).map((nivel) => [llaveDelBorrador(variable, nivel), variable.valores[nivel] ?? null]),
    ),
  );

/** Los campos de texto devuelven texto: una variable numérica se guarda como número. */
export const valorParaGuardar = (variable: VariableConfiguracion, valor: unknown) =>
  typeof variable.predeterminado === 'number' ? Number(valor) : valor;
