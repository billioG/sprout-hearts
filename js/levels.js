// Narrativa basada en libros de relaciones – diálogos estilo Zelda
export const LEVELS = [
  {
    id: 1, title: "El jardín interior", book: "The Gifts of Imperfection – Brené Brown",
    x: 8, y: 8,
    npc: "Brené",
    dialogue: [
      "Hola… bienvenidos al Jardín Interior.",
      "Brené Brown dice que la valentía nace cuando dejamos de fingir perfección.",
      "Dime con honestidad: ¿qué parte de ti consideras imperfecta… y aún así te hace valioso o valiosa?",
      { prompt: true, placeholder: "Escribe lo que sientes…" },
      "Gracias por compartirlo. El amor propio es el suelo donde crece todo lo demás."
    ]
  },
  {
    id: 2, title: "Estilos de apego", book: "Attached – Levine & Heller",
    x: 15, y: 6,
    npc: "Guía del Apego",
    dialogue: [
      "En las relaciones solemos apegarnos de tres formas: ansioso, evitativo o seguro.",
      "Cuando tu pareja se distancia un poco… ¿qué sientes primero?",
      { prompt: true, placeholder: "Ansiedad, alivio, calma… cuéntalo" },
      "Nombrar tu estilo no te encasilla: te da un mapa para cuidar al otro."
    ]
  },
  {
    id: 3, title: "Lenguajes del amor", book: "The 5 Love Languages – Chapman",
    x: 25, y: 7,
    npc: "Chapman",
    dialogue: [
      "Hay cinco lenguajes: palabras, tiempo, regalos, servicios y contacto.",
      "¿Cuál te hace sentir más amado o amada? Ordénalos si puedes.",
      { prompt: true, placeholder: "Ej: 1 tiempo 2 palabras…" },
      "Hablar el idioma del otro es un acto de generosidad diaria."
    ]
  },
  {
    id: 4, title: "Mapas del amor", book: "Gottman – Seven Principles",
    x: 35, y: 5,
    npc: "Gottman",
    dialogue: [
      "Las parejas fuertes construyen ‘Love Maps’: conocen el mundo interior del otro.",
      "Nombra dos amigos cercanos de tu pareja y una fuente de estrés actual suya.",
      { prompt: true, placeholder: "Escribe lo que sabes…" },
      "Si no lo sabías del todo, pregúntale. La curiosidad es intimidad."
    ]
  },
  {
    id: 5, title: "Ofertas de conexión", book: "Gottman – Bids for Connection",
    x: 42, y: 10,
    npc: "Gottman",
    dialogue: [
      "Cada día hacemos pequeñas ‘ofertas’: un comentario, una mirada, un meme.",
      "¿Cómo sueles pedir atención… y cómo responde tu pareja?",
      { prompt: true, placeholder: "Cuéntanos un ejemplo reciente" },
      "Girar hacia esas ofertas es el pegamento silencioso de la relación."
    ]
  },
  {
    id: 6, title: "Los cuatro jinetes", book: "Gottman – Four Horsemen",
    x: 6, y: 15,
    npc: "Centinela",
    dialogue: [
      "Crítica, desprecio, defensividad y silencio predicen tormentas.",
      "En una discusión reciente, ¿cuál de estos apareció?",
      { prompt: true, placeholder: "Sé sincero/a, sin culpar…" },
      "Detectarlos a tiempo permite reparar antes de que crezcan."
    ]
  },
  {
    id: 7, title: "Girar hacia el otro", book: "Gottman – Turning Toward",
    x: 18, y: 14,
    npc: "Gottman",
    dialogue: [
      "En un momento cotidiano, ¿sentiste que tu pareja se acercó o se alejó?",
      { prompt: true, placeholder: "Describe ese momento" },
      "Esos micro-momentos suman más que los grandes gestos."
    ]
  },
  {
    id: 8, title: "Necesidades emocionales", book: "Hold Me Tight – Sue Johnson",
    x: 28, y: 16,
    npc: "Sue",
    dialogue: [
      "Cuando estás herido o asustado, ¿qué necesitas realmente del otro?",
      { prompt: true, placeholder: "Presencia, palabras, espacio…" },
      "Pedir con claridad es un acto de confianza."
    ]
  },
  {
    id: 9, title: "Significado compartido", book: "Gottman – Shared Meaning",
    x: 38, y: 14,
    npc: "Narradora",
    dialogue: [
      "¿Qué rituales les gustaría crear juntos? Mañanas, noches, viajes…",
      { prompt: true, placeholder: "Inventen uno pequeño" },
      "Los rituales dan a la pareja un ‘nosotros’ con historia."
    ]
  },
  {
    id: 10, title: "Reparación", book: "Gottman – Repair Attempts",
    x: 45, y: 18,
    npc: "Sanador",
    dialogue: [
      "Después de pelear, ¿qué frase o gesto te ayuda a volver a conectar?",
      { prompt: true, placeholder: "Una frase, un abrazo…" },
      "La reparación exitosa predice relaciones largas."
    ]
  },
  {
    id: 11, title: "Límites sanos", book: "Boundaries / Who Deserves Your Love",
    x: 10, y: 22,
    npc: "Guardián",
    dialogue: [
      "¿Qué límite personal necesitas que respeten para sentirte seguro/a?",
      { prompt: true, placeholder: "Tiempo solo, temas sensibles…" },
      "Los límites no alejan el amor: lo protegen."
    ]
  },
  {
    id: 12, title: "Gratitud", book: "Atlas of the Heart – Brené Brown",
    x: 20, y: 24,
    npc: "Brené",
    dialogue: [
      "Nombra tres cosas concretas que agradeces de tu pareja esta semana.",
      { prompt: true, placeholder: "Pueden ser pequeñas" },
      "El aprecio diario construye un banco emocional positivo."
    ]
  },
  {
    id: 13, title: "Sueños", book: "Gottman – Dreams Within Conflict",
    x: 30, y: 22,
    npc: "Soñador",
    dialogue: [
      "¿Cuál es un sueño personal tuyo y cómo podría apoyarte tu pareja?",
      { prompt: true, placeholder: "Tu sueño…" },
      "Apoyar el sueño del otro fortalece el ‘nosotros’."
    ]
  },
  {
    id: 14, title: "Intimidad emocional", book: "Hold Me Tight – Sue Johnson",
    x: 40, y: 25,
    npc: "Sue",
    dialogue: [
      "¿Qué te hace sentir más cerca emocionalmente? Comparte un momento de vulnerabilidad.",
      { prompt: true, placeholder: "Un recuerdo seguro…" },
      "La vulnerabilidad es el camino a la intimidad real."
    ]
  },
  {
    id: 15, title: "Auto-compasión", book: "The Gifts of Imperfection",
    x: 5, y: 28,
    npc: "Brené",
    dialogue: [
      "¿Cómo te hablas cuando cometes un error? ¿Cómo te gustaría que te trate tu pareja entonces?",
      { prompt: true, placeholder: "Con honestidad…" },
      "La forma en que nos tratamos se refleja en la relación."
    ]
  },
  {
    id: 16, title: "Dinero y valores", book: "Gottman / Eight Dates",
    x: 15, y: 32,
    npc: "Tesorero",
    dialogue: [
      "¿Qué significa el dinero para ti: seguridad, libertad, generosidad…?",
      { prompt: true, placeholder: "Tus valores…" },
      "Hablar de dinero con calma evita muchas crisis."
    ]
  },
  {
    id: 17, title: "Familia de origen", book: "Gottman",
    x: 25, y: 30,
    npc: "Ancestro",
    dialogue: [
      "¿Qué patrones de tu familia quieres repetir… o cambiar en esta relación?",
      { prompt: true, placeholder: "Con cuidado y respeto" },
      "Conocer el pasado ayuda a no repetirlo a ciegas."
    ]
  },
  {
    id: 18, title: "Aventura", book: "Gottman – Shared Adventures",
    x: 35, y: 33,
    npc: "Explorador",
    dialogue: [
      "¿Qué cosa nueva —grande o pequeña— les gustaría probar juntos?",
      { prompt: true, placeholder: "Una idea divertida" },
      "El juego y la novedad mantienen viva la chispa."
    ]
  },
  {
    id: 19, title: "El perdón", book: "The Mastery of Love – Ruiz",
    x: 44, y: 30,
    npc: "Ruiz",
    dialogue: [
      "¿Hay algo que sientan que aún no se han perdonado?",
      { prompt: true, placeholder: "Si quieres, nómbralo" },
      "El perdón libera a ambos. No borra: suelta el peso."
    ]
  },
  {
    id: 20, title: "Visión de futuro", book: "Gottman – Shared Vision",
    x: 12, y: 36,
    npc: "Oráculo",
    dialogue: [
      "¿Cómo se imaginan su vida juntos en 5 años?",
      { prompt: true, placeholder: "Sueñen en voz alta…" },
      "Una visión compartida da dirección y esperanza."
    ]
  },
  {
    id: 21, title: "Ritual de conexión", book: "Gottman – Rituals",
    x: 22, y: 38,
    npc: "Tejedor",
    dialogue: [
      "Inventen un ritual diario o semanal de solo 5 minutos para conectar.",
      { prompt: true, placeholder: "Ej: té juntos, 3 gratitudes…" },
      "Los rituales son el pegamento invisible."
    ]
  },
  {
    id: 22, title: "Carta de amor", book: "Cierre del viaje",
    x: 32, y: 36,
    npc: "Corazón",
    dialogue: [
      "Has recorrido el mapa del amor.",
      "Escribe una carta corta a tu pareja: ¿por qué la eliges cada día?",
      { prompt: true, placeholder: "Tu carta…" },
      "Este no es el final. Es el comienzo de escucharse mejor. 💕"
    ]
  }
];
