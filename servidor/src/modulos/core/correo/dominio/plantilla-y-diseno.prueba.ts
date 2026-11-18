import { describe, expect, it } from 'vitest';
import { armarCuerpos, escaparHtml } from './diseno-de-correo.js';
import { MarcadorDesconocido } from './errores-de-correo.js';
import { PlantillaDeCorreo } from './plantilla-de-correo.js';

const PERMITIDOS = ['proveedor', 'empresa', 'monto'];

describe('PlantillaDeCorreo', () => {
  it('reemplaza los marcadores y deja vacío el que no trae valor', () => {
    const plantilla = PlantillaDeCorreo.crear('Estimado {proveedor}: {empresa} pagó {monto}.', PERMITIDOS);
    expect(plantilla.aplicar({ proveedor: 'Ana', empresa: 'Finca' })).toBe('Estimado Ana: Finca pagó .');
    expect(plantilla.marcadores).toEqual(['proveedor', 'empresa', 'monto']);
  });

  it('rechaza un marcador desconocido y uno vacío', () => {
    expect(() => PlantillaDeCorreo.crear('Hola {nit}', PERMITIDOS)).toThrow(MarcadorDesconocido);
    expect(() => PlantillaDeCorreo.crear('Hola {}', PERMITIDOS)).toThrow(MarcadorDesconocido);
  });

  it('no vuelve a expandir un valor que parezca marcador y le quita los controles', () => {
    const plantilla = PlantillaDeCorreo.crear('{proveedor}|{empresa}', PERMITIDOS);
    expect(plantilla.aplicar({ proveedor: '{empresa}\u202E\r\nX', empresa: 'Finca' })).toBe('{empresa}\nX|Finca');
  });
});

describe('diseño del correo', () => {
  const base = { empresa: 'Finca "El Sol" & Hijos', aplicacion: 'Arrancar', conRespuesta: true };

  it('escapa todo dato en el HTML y no lleva enlaces ni imágenes', () => {
    const { html } = armarCuerpos({ ...base, mensaje: 'Hola <a href="http://x.com">Pague aquí</a>\nLínea 2' });
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;a href=&quot;http://x.com&quot;&gt;Pague aquí&lt;/a&gt;<br>Línea 2');
    expect(html).toContain('Finca &quot;El Sol&quot; &amp; Hijos');
  });

  it('separa los párrafos y el texto plano lleva el pie', () => {
    const { html, texto } = armarCuerpos({ ...base, mensaje: 'Uno\n\nDos' });
    expect(html.match(/<p style="margin:0 0 12px">/g)).toHaveLength(2);
    expect(texto).toContain('Uno\n\nDos\n\n--\nEste correo lo envió Finca');
    expect(texto).toContain('Para responder, use Responder.');
  });

  it('sin «Responder a» manda a comunicarse con la empresa', () => {
    const { texto } = armarCuerpos({ ...base, mensaje: 'Hola', conRespuesta: false });
    expect(texto).toContain('comuníquese con Finca');
  });

  it('escaparHtml cubre los cinco caracteres', () => {
    expect(escaparHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
