# FORTUNA — De cero a imperio

Simulador de vida económica en mundo abierto: empiezas sin nada en Puerto Valmera y construyes
tu fortuna invirtiendo de miles de formas mientras vives una vida completa.

> Estado: **Fase 3 completada** — ciudad 3D procedural de Puerto Valmera (WebGPU/WebGL2) con
> ciclo día/noche y jugador en tercera persona, motor económico determinista y catálogo de más
> de 5.000 inversiones en la terminal del inversor. Ver `PLAN.md`.

## Jugar
```bash
cd fortuna
npm install
npm run dev        # http://localhost:5173
```

**En la ciudad**: `WASD`/flechas moverse · `Mayús` correr · `Espacio` saltar · clic para
controlar la cámara con el ratón (rueda: zoom) · mando compatible · `Tab` terminal del
inversor · `1`–`5` velocidad del tiempo · `P` pausa · `F3` rendimiento · `N` Cuaderno.

**En la terminal**: `Espacio` pausa/reanuda · `1`–`5` velocidad · `N` Cuaderno · `º` modo
depuración (muestra la información oculta de la simulación) · `Tab` volver a la ciudad.

Ajustes → Gráficos: calidad Bajo/Medio/Alto/Ultra y "Forzar WebGL2" si tu navegador tiene
problemas con WebGPU.

## Qué hay ahora
- Puerto Valmera en 3D: diez barrios con carácter propio (torres de cristal, casco viejo,
  naves del polígono, villas, huertas), sol real según la estación, farolas y ventanas que se
  encienden de noche, colisiones físicas y resolución dinámica.
- 6 países con ciclo económico, bancos centrales, inflación, divisas y crisis sistémicas.
- 50 empresas cotizadas con resultados, dividendos, fraudes, OPA, quiebras y salidas a bolsa.
- 48+ bonos soberanos y corporativos, banca (remunerada, depósitos, préstamos) y fiscalidad.
- Noticias que mueven los precios, rumores falsos, señales adelantadas de recesión.
- **Más de 5.000 oportunidades** en 21 clases de activo: ETF, fondos, cripto, materias primas,
  divisas, opciones, futuros, CFD, inmuebles en diez barrios, embargos, negocios, franquicias,
  startups, tierras, energía, coleccionismo, cine y deporte, préstamos P2P, pensiones, seguros
  y filantropía. Cada una con información oculta que se descubre investigando.
- Cuaderno del inversor con 50 conceptos que aprendes jugando.
- Guardado en el navegador con autoguardado, exportación e importación.

## Desarrollo
Ver `CLAUDE.md` (comandos y reglas), `PLAN.md` (fases), `BALANCE.md` (balance) y `ASSETS.md`.
