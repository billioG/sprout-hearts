# 🌱 Sprout Hearts

Juego para parejas – RPG top-down asíncrono/síncrono para conocerse más.

**PIN de 6 dígitos** · 22 niveles · Móvil · Sonido 8-bit · Pareja visible en el mapa

## Características

- 22 niveles inspirados en libros de relaciones y amor propio
- Motor Phaser 3 con assets **Sprout Lands** + **LPC**
- Controles táctiles (D-pad + botón ♥)
- Sistema de sonido 8-bit (Web Audio)
- Selector de avatar (Azul / Rosa / Granja)
- Personaje de la pareja visible y sincronizado
- Supabase Realtime (o modo offline)

## Publicar en GitHub Pages

1. Crea un repo `sprout-hearts` en GitHub
2. Sube el contenido de esta carpeta
3. **Settings → Pages → Source:** branch `main` / root
4. (Opcional) Configura Supabase:
   - Ejecuta `supabase/schema.sql` en el SQL Editor
   - Pon URL y anon key en `js/supabase.js`

URL final: `https://TU-USUARIO.github.io/sprout-hearts/`

## Probar en local

```bash
npx serve .
# o: python -m http.server 8000
```

## Controles

| | Desktop | Móvil |
|--|---------|-------|
| Mover | Flechas / WASD | D-pad |
| Interactuar | Espacio | Botón ♥ |
| Sonido | 🔊 en el HUD | 🔊 en el HUD |

## Flujo

1. Un jugador **Crea sala** → recibe PIN
2. Ambos eligen **avatar** y nombre
3. El otro **se une con el PIN**
4. Aparecen juntos en el mapa · caminan · tocan corazones · responden preguntas
5. Las respuestas se sincronizan (o se ven al volver si es asíncrono)

## Créditos

Ver [CREDITS.md](CREDITS.md)

- Sprout Lands – Cup Nooble
- LPC – Liberated Pixel Cup / OpenGameArt
