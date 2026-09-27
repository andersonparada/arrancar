import { z } from 'zod';
import {
  correoOpcional,
  nitOpcional,
  nombresYApellidos,
  textoObligatorio,
} from '../../compartido/http/esquemas-comunes.js';
import { nombreUsuario } from '../../identidad/http/usuarios.esquemas-http.js';

export const esquemaAltaCuenta = z.object({
  nombreCuenta: textoObligatorio(120),
  empresa: z.object({
    nombre: textoObligatorio(120),
    nit: nitOpcional,
  }),
  propietario: z.object({
    ...nombresYApellidos,
    /**
     * Vacío: se crea un usuario nuevo con nombre generado. Con valor: si ya existe
     * se reutiliza (p. ej. alguien que ya es dueño de otra cuenta); si no, se crea con ese nombre.
     */
    usuario: nombreUsuario.optional(),
    correo: correoOpcional,
    /** Obligatoria solo si el usuario es nuevo; si ya existe, conserva la suya. */
    contrasena: z.string().min(10, 'Use al menos 10 caracteres.').max(200).optional(),
  }),
  modulos: z.array(z.string()).default([]),
});

export const esquemaCambioCuenta = z.object({
  nombre: textoObligatorio(120).optional(),
  activa: z.boolean().optional(),
});

export const esquemaParamsCuenta = z.object({ cuentaId: z.uuid() });
export const esquemaParamsModuloCuenta = z.object({ cuentaId: z.uuid(), clave: z.string().min(1) });

export type AltaCuenta = z.infer<typeof esquemaAltaCuenta>;
export type CambioCuenta = z.infer<typeof esquemaCambioCuenta>;
export type ParamsCuenta = z.infer<typeof esquemaParamsCuenta>;
export type ParamsModuloCuenta = z.infer<typeof esquemaParamsModuloCuenta>;
