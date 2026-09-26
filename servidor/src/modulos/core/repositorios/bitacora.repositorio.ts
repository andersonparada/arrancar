import { desc, eq } from 'drizzle-orm';
import { bd } from '../base-datos/conexion.js';
import { bitacoraSuperacceso } from '../esquemas/bitacora.esquema.js';
import { usuarios } from '../esquemas/usuarios.esquema.js';
import { nombreCompleto } from './usuarios.repositorio.js';
import { empresas } from '../esquemas/empresas.esquema.js';

export interface EntradaBitacora {
  usuarioId: string;
  empresaId: string | null;
  accion: string;
  detalle?: Record<string, unknown>;
  direccionIp?: string | null;
}

export const bitacoraRepositorio = {
  async registrar(entrada: EntradaBitacora): Promise<void> {
    await bd.insert(bitacoraSuperacceso).values(entrada);
  },

  async listarRecientes(limite = 200) {
    return bd
      .select({
        id: bitacoraSuperacceso.id,
        accion: bitacoraSuperacceso.accion,
        detalle: bitacoraSuperacceso.detalle,
        direccionIp: bitacoraSuperacceso.direccionIp,
        creadoEn: bitacoraSuperacceso.creadoEn,
        usuarioNombre: nombreCompleto,
        empresaNombre: empresas.nombre,
      })
      .from(bitacoraSuperacceso)
      .innerJoin(usuarios, eq(usuarios.id, bitacoraSuperacceso.usuarioId))
      .leftJoin(empresas, eq(empresas.id, bitacoraSuperacceso.empresaId))
      .orderBy(desc(bitacoraSuperacceso.creadoEn))
      .limit(limite);
  },
};
