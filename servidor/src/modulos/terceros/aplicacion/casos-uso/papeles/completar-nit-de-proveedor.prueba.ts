import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Nit, NitInvalido } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { NitDeProveedorSinNumero, ProveedorYaTieneOtroNit } from '../../../dominio/errores.js';
import { IdentidadDeTercero } from '../../../dominio/identidad-de-tercero.js';
import { Tercero } from '../../../dominio/tercero.js';
import { TercerosEnMemoria } from '../../../pruebas/dobles-de-terceros.js';
import { NitYaRegistrado } from '../../errores.js';
import { CompletarNitDeProveedor } from './completar-nit-de-proveedor.js';

const NIT = '576937K';
const OTRO_NIT = '12345679';

let terceros: TercerosEnMemoria;
let caso: CompletarNitDeProveedor;

async function registrar(nombre: string, cambios: { nit?: string; proveedor?: boolean } = {}): Promise<Tercero> {
  const identidad = IdentidadDeTercero.crear('juridica', {
    nombres: null,
    apellidos: null,
    razonSocial: nombre,
    nombreComercial: null,
  });
  const tercero = Tercero.registrar(Identificador.desde(crypto.randomUUID()), {
    identidad,
    nit: cambios.nit ? Nit.crear(cambios.nit) : null,
    dpi: null,
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

function completar(proveedor: Tercero, nit: string): Promise<void> {
  return caso.ejecutar(operadorDePrueba(), { proveedorId: proveedor.id.valor, nit });
}

function nitDe(tercero: Tercero): string | null {
  return tercero.instantanea().nit?.valor ?? null;
}

beforeEach(() => {
  terceros = new TercerosEnMemoria();
  caso = new CompletarNitDeProveedor({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: terceros,
    consultas: terceros,
  });
});

describe('completar el NIT de un proveedor', () => {
  it('pone el NIT normalizado cuando el proveedor no lo tiene', async () => {
    const proveedor = await registrar('Agro, S.A.');

    await completar(proveedor, ' 576937-k ');

    expect(nitDe(proveedor)).toBe(NIT);
  });

  it('con el mismo NIT que ya tiene no hace nada', async () => {
    const proveedor = await registrar('Agro, S.A.', { nit: NIT });

    await completar(proveedor, NIT);

    expect(nitDe(proveedor)).toBe(NIT);
  });

  it('si ya tiene otro NIT, lo rechaza y lo deja como estaba', async () => {
    const proveedor = await registrar('Agro, S.A.', { nit: OTRO_NIT });

    await expect(completar(proveedor, NIT)).rejects.toThrow(ProveedorYaTieneOtroNit);
    expect(nitDe(proveedor)).toBe(OTRO_NIT);
  });

  it('rechaza un NIT con dígito verificador incorrecto', async () => {
    const proveedor = await registrar('Agro, S.A.');

    await expect(completar(proveedor, '5769370')).rejects.toThrow(NitInvalido);
    expect(nitDe(proveedor)).toBeNull();
  });

  it('rechaza consumidor final', async () => {
    const proveedor = await registrar('Agro, S.A.');

    await expect(completar(proveedor, 'CF')).rejects.toThrow(NitDeProveedorSinNumero);
    expect(nitDe(proveedor)).toBeNull();
  });

  it('rechaza un NIT que ya es de otro tercero de la cuenta', async () => {
    await registrar('Ferretería López', { nit: NIT, proveedor: false });
    const proveedor = await registrar('Agro, S.A.');

    await expect(completar(proveedor, NIT)).rejects.toThrow(NitYaRegistrado);
    expect(nitDe(proveedor)).toBeNull();
  });

  it('un tercero sin papel de proveedor no existe como proveedor', async () => {
    const soloCliente = await registrar('Cliente', { proveedor: false });

    await expect(completar(soloCliente, NIT)).rejects.toThrow(RecursoNoEncontrado);
  });
});
