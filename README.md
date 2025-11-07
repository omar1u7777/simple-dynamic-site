# Enkel Dynamisk Webbplats

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

En enkel dynamisk webbplats byggd med HTML, CSS och JavaScript. Detta projekt demonstrerar grundläggande frontend-utvecklingstekniker inklusive API-integration, responsiv design och användarinteraktion.

## 🚀 Funktioner

- **Hem**: Översikt över webbplatsens funktioner
- **Inlägg**: Dynamiska inlägg hämtade från DummyJSON API med användarprofiler och kommentarer
- **Kontakt**: Validerat kontaktformulär med klient-side validering
- **Responsiv design**: Fungerar på desktop, tablet och mobil
- **Tillgänglighet**: ARIA-attribut och semantisk HTML

## 🛠️ Teknologier

- **HTML5**: Semantisk struktur
- **CSS3**: Responsiv design med CSS Grid och Flexbox
- **Vanilla JavaScript**: ES6+ funktioner, async/await, fetch API
- **DummyJSON API**: Extern data för inlägg, användare och kommentarer

## 📁 Projektstruktur

```
simple-dynamic-site/
├── index.html          # Hemsida
├── posts.html          # Inläggssida
├── contact.html        # Kontaktsida
├── css/
│   └── styles.css      # Stilar
├── js/
│   ├── api.js          # API-funktioner
│   └── app.js          # Applikationslogik
├── assets/
│   └── images/
│       └── omar.jpg    # Profilbild
├── .gitignore
├── LICENSE
└── README.md
```

## 🚀 Komma igång

### Förutsättningar

- En modern webbläsare (Chrome, Firefox, Safari, Edge)
- Internetanslutning för API-data

### Installation

1. Klona repositoryt:
   ```bash
   git clone https://github.com/ditt-github-användarnamn/simple-dynamic-site.git
   cd simple-dynamic-site
   ```

2. Öppna `index.html` i din webbläsare eller använd en lokal server:
   ```bash
   # Använd Python (om installerat)
   python -m http.server 8000

   # Eller Node.js
   npx serve .
   ```

3. Navigera till `http://localhost:8000` i din webbläsare.

## 📖 Användning

- **Hem**: Läs om webbplatsens funktioner
- **Inlägg**: Bläddra genom inlägg, klicka på användarnamn för att se profiler
- **Kontakt**: Fyll i formuläret och bekräfta för att skicka (simulerat)

## 🔧 Utveckling

Projektet använder vanilla JavaScript utan byggverktyg. Alla ändringar görs direkt i källfilerna.

### Kodkvalitet

- XSS-skyddad genom HTML-escaping
- Semantisk HTML för bättre tillgänglighet
- Responsiv design för alla skärmstorlekar
- Felhantering för API-anrop

## 📝 Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## 👤 Författare

**Omar Alhaek**
- Frontend Dev Student, Högskolan i Kristianstad
- GitHub: [ditt-github-användarnamn](https://github.com/ditt-github-användarnamn)

## ⚠️ Viktigt

- Inlägg hämtas från https://dummyjson.com - internetanslutning krävs
- Detta är ett utbildningsprojekt för att demonstrera frontend-kunskaper


