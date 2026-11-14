import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR, proveedorConCredito } from './cuentas-por-pagar.js';
import type { EntornoApi } from './entorno-api.js';
import { consultar, haceDias, prepararEscenario, type EscenarioDeDocumentos } from './escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './escenarios.js';

export const RUTA_DE_CONTRASENAS = '/api/cuentas-por-pagar/contrasenas';
const NOMBRES = [
  'Alfa',
  'Bravo',
  'Cobre',
  'Delta',
  'Eco',
  'Fénix',
  'Gama',
  'Halcón',
  'Índigo',
  'Jade',
  'Kilo',
  'Lima',
  'Mármol',
  'Níquel',
  'Ópalo',
  'Plomo',
  'Quarzo',
  'Rubí',
  'Sauce',
  'Topacio',
];

export type ProveedorDePrueba = {
  proveedorId: string;
  nitEmisor: string;
};

/** Una cuenta con Cuentas por pagar, fecha de inicio hace 30 días y dos usuarios (solo ver contraseñas, y sin ellas). */
export class EscenarioDeContrasenas {
  private secuencia = 0;

  private constructor(
    readonly escenario: EscenarioDeDocumentos,
    readonly documentos: DocumentosPorPagarDePrueba,
    readonly usuarios: { soloVer: ClienteApi; sinPermisos: ClienteApi },
  ) {}

  static async preparar(entorno: EntornoApi, usuario: string): Promise<EscenarioDeContrasenas> {
    const escenario = await prepararEscenario(entorno, usuario, MODULOS_DE_CUENTAS_POR_PAGAR);
    const inicio = await escenario.cuenta.propietario.put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, {
      fechaDeInicio: haceDias(30),
    });
    expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
    const usuarioCon = (nombres: string, permisos: string[]) =>
      crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Contrasenas', permisos });
    return new EscenarioDeContrasenas(escenario, new DocumentosPorPagarDePrueba(escenario, haceDias(3)), {
      soloVer: await usuarioCon('Solo mira', ['cuentas-por-pagar.contrasenas.ver']),
      sinPermisos: await usuarioCon('Sin nada', ['cuentas-por-pagar.documentos.ver']),
    });
  }

  propietario(): ClienteApi {
    return this.escenario.cuenta.propietario;
  }

  crear(cuerpo: Record<string, unknown>, cliente: ClienteApi = this.propietario()) {
    return cliente.post(RUTA_DE_CONTRASENAS, cuerpo);
  }

  /** Un proveedor nuevo con crédito, para tener documentos propios. */
  unProveedor(): Promise<ProveedorDePrueba> {
    const nombre = `${NOMBRES[this.secuencia]} S.A.`;
    return proveedorConCredito(this.escenario, { nombre, nit: String(5900000 + this.secuencia++), diasDeCredito: 30 });
  }

  /** Un documento de Q1,120.00 (o del total que se diga) del proveedor; devuelve su id de Cuentas por pagar. */
  async unCargo({ proveedorId, nitEmisor }: ProveedorDePrueba, total = '1120.00'): Promise<string> {
    const libroId = await this.documentos.registrar({
      proveedorId,
      nitEmisor,
      lineas: [{ conceptoId: this.escenario.conceptoId, total }],
    });
    return (await this.documentos.fila(libroId))!.id;
  }
}

/** El cuerpo de crear una contraseña con fecha de pago dentro de 10 días. */
export const cuerpoDeContrasena = (proveedorId: string, ids: string[], cambios: Record<string, unknown> = {}) => ({
  proveedorId,
  fechaDePago: haceDias(-10),
  documentos: ids,
  ...cambios,
});

export const contrasenasGuardadas = async () =>
  Number((await consultar<{ n: string }>('select count(*)::text as n from cuentas_por_pagar.contrasenas'))[0]!.n);
