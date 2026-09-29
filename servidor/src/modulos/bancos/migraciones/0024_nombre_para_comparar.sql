-- P7 (S1): normaliza un nombre para compararlo (beneficiarios, referencias y observaciones) en un solo lugar.
-- Quita acentos y mayúsculas, deja solo letras y números, y quita formas jurídicas y conectores como palabras
-- completas: «Agroservicios El Rancho, S.A.» y «AGROSERVICIOS  el rancho sa» dan `agroservicios rancho`.
-- Si un día cambia la regla hay que quitar y volver a agregar las columnas generadas que la usan.
CREATE FUNCTION "bancos"."nombre_para_comparar"(texto text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(translate(texto, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
              '[^a-z0-9]+', ' ', 'g'
            ),
            '\m(s a|sa|s de r l|srl|ltda|cia|sociedad anonima)\M', ' ', 'g'
          ),
          '\m(de|del|la|el|los|las|y)\M', ' ', 'g'
        ),
        ' +', ' ', 'g'
      )
    ),
    ''
  )
$$;
