// ===== 22 Niveles basados en los mejores libros de relaciones y amor propio =====
export const LEVELS = [
  {
    id: 1,
    title: "El jardín interior",
    book: "The Gifts of Imperfection – Brené Brown",
    question: "¿Qué parte de ti consideras 'imperfecta' y aún así te hace valioso/a? Comparte una historia corta.",
    hint: "El amor propio es la base de todo lo demás.",
    x: 8, y: 8   // posición del corazón en el mapa
  },
  {
    id: 2,
    title: "Estilos de apego",
    book: "Attached – Amir Levine & Rachel Heller",
    question: "¿Cómo reaccionas normalmente cuando tu pareja se distancia un poco? (ansioso / evitativo / seguro)",
    hint: "Conocer tu estilo ayuda a entender las dinámicas.",
    x: 15, y: 6
  },
  {
    id: 3,
    title: "Lenguajes del amor",
    book: "The 5 Love Languages – Gary Chapman",
    question: "Ordena del 1 al 5 cómo prefieres recibir amor: Palabras de afirmación, Tiempo de calidad, Regalos, Actos de servicio, Contacto físico.",
    hint: "Habla el idioma de tu pareja.",
    x: 25, y: 7
  },
  {
    id: 4,
    title: "Mapas del amor",
    book: "The Seven Principles – John Gottman",
    question: "Nombra dos de mis mejores amigos actuales y una de mis mayores fuentes de estrés ahora mismo.",
    hint: "Gottman llama a esto construir 'Love Maps'.",
    x: 35, y: 5
  },
  {
    id: 5,
    title: "Ofertas de conexión",
    book: "Gottman – Bids for Connection",
    question: "¿Cómo suelo pedirte atención o cariño en el día a día? ¿Cómo respondes normalmente?",
    hint: "Los pequeños gestos importan más que los grandes.",
    x: 42, y: 10
  },
  {
    id: 6,
    title: "Los cuatro jinetes",
    book: "Gottman – The Four Horsemen",
    question: "Recuerda una discusión reciente. ¿Apareció crítica, desprecio, defensividad o silencio? ¿Cómo podríamos repararlo?",
    hint: "Identificarlos es el primer paso para detenerlos.",
    x: 6, y: 15
  },
  {
    id: 7,
    title: "Girar hacia el otro",
    book: "Gottman – Turning Toward",
    question: "Cuéntame un momento reciente en el que sentiste que me acerqué a ti (o me alejé). ¿Cómo te hizo sentir?",
    hint: "El 86% de las parejas que 'giran hacia' se mantienen juntas.",
    x: 18, y: 14
  },
  {
    id: 8,
    title: "Necesidades emocionales",
    book: "Hold Me Tight – Sue Johnson",
    question: "Cuando estás herido/a o asustado/a, ¿qué necesitas realmente de mí? (presencia, palabras, espacio...)",
    hint: "La conexión emocional es el ancla.",
    x: 28, y: 16
  },
  {
    id: 9,
    title: "Significado compartido",
    book: "Gottman – Shared Meaning",
    question: "¿Qué rituales o tradiciones nos gustaría crear juntos? (mañanas, noches, viajes, fechas especiales)",
    hint: "Las parejas con significado compartido son más resilientes.",
    x: 38, y: 14
  },
  {
    id: 10,
    title: "Reparación de conflictos",
    book: "Gottman – Repair Attempts",
    question: "Cuando discutimos, ¿qué frases o gestos te ayudan a calmarte y volver a conectar?",
    hint: "Las 'reparaciones' exitosas predicen la duración de la relación.",
    x: 45, y: 18
  },
  {
    id: 11,
    title: "Límites sanos",
    book: "Who Deserves Your Love – KC Davis / Boundaries",
    question: "¿Qué límites personales necesitas que yo respete para sentirte seguro/a y libre?",
    hint: "Los límites protegen el amor, no lo alejan.",
    x: 10, y: 22
  },
  {
    id: 12,
    title: "Gratitud y aprecio",
    book: "Atlas of the Heart – Brené Brown",
    question: "Nombra tres cosas concretas que agradeces de mí esta semana (pueden ser pequeñas).",
    hint: "El aprecio diario construye un banco emocional positivo.",
    x: 20, y: 24
  },
  {
    id: 13,
    title: "Sueños individuales",
    book: "Gottman – Dreams Within Conflict",
    question: "¿Cuál es un sueño personal que tienes y cómo puedo apoyarte mejor para lograrlo?",
    hint: "Apoyar los sueños del otro fortalece el 'nosotros'.",
    x: 30, y: 22
  },
  {
    id: 14,
    title: "Intimidad emocional",
    book: "Hold Me Tight – Sue Johnson",
    question: "¿Qué te hace sentir más cerca de mí emocionalmente? Comparte un momento de vulnerabilidad que valoras.",
    hint: "La vulnerabilidad es el camino a la intimidad real.",
    x: 40, y: 25
  },
  {
    id: 15,
    title: "Auto-compasión",
    book: "The Gifts of Imperfection – Brené Brown",
    question: "¿Cómo te hablas a ti mismo/a cuando cometes un error? ¿Cómo te gustaría que te tratara yo en esos momentos?",
    hint: "La forma en que nos tratamos a nosotros mismos se refleja en la relación.",
    x: 5, y: 28
  },
  {
    id: 16,
    title: "Dinero y valores",
    book: "Gottman / Eight Dates",
    question: "¿Qué significa el dinero para ti? Seguridad, libertad, generosidad... ¿Cómo podemos alinear nuestros valores?",
    hint: "Las conversaciones sobre dinero evitan muchas crisis.",
    x: 15, y: 32
  },
  {
    id: 17,
    title: "Familia de origen",
    book: "Gottman – Family of Origin",
    question: "¿Qué patrones de tu familia de origen quieres repetir o cambiar en nuestra relación?",
    hint: "Conocer el pasado ayuda a no repetirlo inconscientemente.",
    x: 25, y: 30
  },
  {
    id: 18,
    title: "Aventura y juego",
    book: "Gottman – Create Shared Adventures",
    question: "¿Qué cosa nueva (grande o pequeña) te gustaría probar juntos en los próximos meses?",
    hint: "El juego y la novedad mantienen viva la chispa.",
    x: 35, y: 33
  },
  {
    id: 19,
    title: "El perdón",
    book: "The Mastery of Love – Don Miguel Ruiz",
    question: "¿Hay algo que sientas que aún no nos hemos perdonado mutuamente? ¿Cómo podemos soltarlo?",
    hint: "El perdón libera a ambos.",
    x: 44, y: 30
  },
  {
    id: 20,
    title: "Visión de futuro",
    book: "Gottman – Shared Vision",
    question: "¿Cómo te imaginas nuestra vida juntos en 5 años? ¿Qué queremos haber construido?",
    hint: "Una visión compartida da dirección y esperanza.",
    x: 12, y: 36
  },
  {
    id: 21,
    title: "Ritual de conexión",
    book: "Gottman – Rituals of Connection",
    question: "Inventemos juntos un ritual diario o semanal que nos mantenga conectados (aunque sea de 5 minutos).",
    hint: "Los rituales son el pegamento de la relación.",
    x: 22, y: 38
  },
  {
    id: 22,
    title: "Carta de amor",
    book: "Varios – Cierre del viaje",
    question: "Escribe una carta corta (o mensaje) a tu pareja diciéndole por qué la eliges cada día.",
    hint: "El final del mapa... y el comienzo de algo más profundo.",
    x: 32, y: 36
  }
];
