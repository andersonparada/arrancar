import { desc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { empresas } from '../../../esquemas/empresas.esquema.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { nombreCompleto } from '../../../identidad/infraestructura/persistencia/consultas-usuarios.drizzle.js';
import type { EntradaDeBitacoraDto } from '../../aplicacion/dto/entrada-de-bitacora.dto.js';
import type { Bitacora, NuevaEntrada } from '../../aplicacion/puertos/bitacora.js';
import { bitacoraSuperacceso } from './bitacora.tablas.js';

/**
 * Sin RLS ni unidad de trabajo: la usa soporte, que trabaja por encima de las
 * cuentas, y se escribe aunque la operación que la origina no sea de una empresa.
 */
export class BitacoraDrizzle implements Bitacora {
  constructor(private readonly bd: BaseDatos) {}

  async registrar(entrada: NuevaEntrada): Promise<void> {
    await this.bd.insert(bitacoraSuperacceso).values(entrada);
  }

  recientes(limite: number): Promise<EntradaDeBitacoraDto[]> {
    return this.bd
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
  }
}
