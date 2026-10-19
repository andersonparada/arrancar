import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Dpi, DpiInvalido } from '../../../../core/compartido/dominio/objetos-valor/dpi.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ProveedorYaTieneOtroDpi } from '../../../dominio/errores.js';
import { IdentidadDeTercero } from '../../../dominio/identidad-de-tercero.js';
import { Tercero } from '../../../dominio/tercero.js';
import { TercerosEnMemoria } from '../../../pruebas/dobles-de-terceros.js';
import { DpiYaRegistrado } from '../../errores.js';
import { CompletarDpiDeProveedor } from './completar-dpi-de-proveedor.js';

const DPI = '1234567890101';
const OTRO_DPI = '2345678130101';

let terceros: TercerosEnMemoria;
let caso: CompletarDpiDeProveedor;

async function registrar(nombre: string, cambios: { dpi?: string; proveedor?: boolean } = {}): Promise<Tercero> {
  const identidad = IdentidadDeTercero.crear('juridica', {
    nombres: null,
    apellidos: null,
    razonSocial: nombre,
    nombreComercial: null,
  });
  const tercero = Tercero.registrar(Identificador.desde(crypto.randomUUID()), {
    identidad,
    nit: null,
    dpi: cambios.dpi ? Dpi.crear(cambios.dpi) : null,
    telefono: null,
    whatsapp: null,
    correo: null,
    ubicacion: { departamentoCodigo: null, municipioCodigo: null, direccion: null },
    fotoArchivoId: null,
    notas: null,
    activo: true,
  });
  if (cambios.proveedor !== false)
    tercero.asignarPapel({ tipo: 'proveedor', categoriaId: null, activo: true, notas: null });
  await terceros.agregar(tercero);
  return tercero;
}

function completar(proveedor: Tercero, dpi: string): Promise<void> {
  return caso.ejecutar(operadorDePrueba(), { proveedorId: proveedor.id.valor, dpi });
}

function dpiDe(tercero: Tercero): string | null {
  return tercero.instantanea().dpi?.valor ?? null;
}

beforeEach(() => {
  terceros = new TercerosEnMemoria();
  caso = new CompletarDpiDeProveedor({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: terceros,
    consultas: terceros,
  });
});

describe('completar el DPI de un proveedor', () => {
  it('pone el DPI normalizado cuando el proveedor no lo tiene', async () => {
    const proveedor = await registrar('Agro, S.A.');

    await completar(proveedor, ' 1234 56789 0101 ');

    expect(dpiDe(proveedor)).toBe(DPI);
  });

  it('con el mismo DPI que ya tiene no hace nada', async () => {
    const proveedor = await registrar('Agro, S.A.', { dpi: DPI });

    await completar(proveedor, DPI);

    expect(dpiDe(proveedor)).toBe(DPI);
  });

  it('si ya tiene otro DPI, lo rechaza y lo deja como estaba', async () => {
    const proveedor = await registrar('Agro, S.A.', { dpi: OTRO_DPI });

    await expect(completar(proveedor, DPI)).rejects.toThrow(ProveedorYaTieneOtroDpi);
    expect(dpiDe(proveedor)).toBe(OTRO_DPI);
  });

  it('rechaza un DPI inválido', async () => {
    const proveedor = await registrar('Agro, S.A.');

    await expect(completar(proveedor, '1234567890123')).rejects.toThrow(DpiInvalido);
    expect(dpiDe(proveedor)).toBeNull();
  });

  it('rechaza un DPI que ya es de otro tercero de la cuenta', async () => {
    await registrar('Ferretería López', { dpi: DPI, proveedor: false });
    const proveedor = await registrar('Agro, S.A.');

    await expect(completar(proveedor, DPI)).rejects.toThrow(DpiYaRegistrado);
    expect(dpiDe(proveedor)).toBeNull();
  });

  it('un tercero sin papel de proveedor no existe como proveedor', async () => {
    const soloCliente = await registrar('Cliente', { proveedor: false });

    await expect(completar(soloCliente, DPI)).rejects.toThrow(RecursoNoEncontrado);
  });
});
