# ASSETS.md — cómo sustituir los recursos generados por código

El juego no depende de descargas externas: todo lo visual se genera por código (horizonte de la
pantalla de título, gráficos, y en la Fase 3+ la ciudad, edificios y materiales). La carpeta
`assets/` está preparada para que puedas añadir recursos de mayor calidad **sin tocar la lógica**.

```
assets/
  models/     glTF/GLB (edificios clave, vehículos, personajes, mobiliario urbano)
  textures/   KTX2/Basis preferentemente (PBR: baseColor, normal, roughness/metalness, AO)
  audio/      OGG/Opus (música por barrio, ambientes, efectos, radio)
  fonts/      tipografías adicionales (las actuales vienen de @fontsource)
```

## Reglas
1. **Formato**: modelos en glTF 2.0 binario (`.glb`), metros como unidad, +Y arriba, origen en la
   base del objeto. Texturas en KTX2 (UASTC para normales, ETC1S para color) con mipmaps.
2. **Nombres**: `categoria_nombre_variante_lodN.glb` (p. ej. `building_bank-hq_a_lod0.glb`).
   Cada LOD en su fichero o como nodos `LOD0..LOD3` dentro del mismo GLB.
3. **Registro**: cada recurso se declara en un manifiesto (`src/data/assets.ts`, Fase 3) con su id
   lógico. El código pide ids lógicos (`building:bank-hq`); si el fichero no existe, se usa el
   generador procedural equivalente. Así el juego siempre arranca.
4. **Presupuestos** (calidad Alta): edificio clave ≤ 60k triángulos en LOD0; edificio genérico
   ≤ 8k; personaje ≤ 25k con ≤ 4 materiales; texturas ≤ 2048² salvo edificios clave (4096²).
5. **Licencias**: solo recursos con licencia compatible con distribución comercial (CC0, CC-BY con
   atribución en `assets/CREDITS.md`, o licencias compradas). Nada con marcas reales.

## Bibliotecas recomendadas
- Modelos y texturas CC0: Poly Haven, ambientCG, Kenney, Quaternius.
- Sonido: Freesound (revisar licencia de cada clip), Sonniss GDC bundles.
- Convierte con `gltf-transform` (`gltf-transform optimize in.glb out.glb --texture-compress ktx2`).
