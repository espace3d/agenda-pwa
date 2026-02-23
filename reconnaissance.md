# Reconnaissance vocale - Guide de duplication

Guide complet pour reimplementer la fonctionnalite de dictee vocale dans une autre application React.

---

## 1. API utilisee

L'API native du navigateur **Web Speech API** (SpeechRecognition).

```js
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
```

- Pas de dependance externe
- Compatible Chrome, Edge, Safari (avec prefixe `webkit`)
- Non supportee sur Firefox

---

## 2. Configuration de la reconnaissance

```js
const rec = new SpeechRecognition();
rec.lang = 'fr-FR';          // Langue francaise
rec.continuous = false;       // S'arrete apres chaque phrase
rec.interimResults = true;    // Affiche le texte en temps reel avant validation
```

### Parametres cles
| Parametre        | Valeur  | Pourquoi                                                    |
|------------------|---------|-------------------------------------------------------------|
| `lang`           | `fr-FR` | Reconnaissance en francais. Changer selon la langue cible   |
| `continuous`     | `false` | On prefere redemarrer manuellement pour plus de controle    |
| `interimResults` | `true`  | Permet d'afficher un apercu live pendant que l'user parle   |

---

## 3. Constantes

```js
const SILENCE_TIMEOUT = 700; // ms - delai avant de considerer un silence comme fin de phrase
```

Ce timeout force l'arret de la reconnaissance si aucun nouveau mot n'est detecte pendant 700ms. Cela permet de decouper naturellement les phrases sans attendre le timeout natif du navigateur (beaucoup plus long).

---

## 4. State React necessaire

```js
const [dictating, setDictating] = useState(false);       // Est-ce qu'on dicte ?
const [dictLiveText, setDictLiveText] = useState('');     // Texte interim affiche en live
const dictRecognitionRef = useRef(null);                  // Instance SpeechRecognition active
const dictRestartRef = useRef(null);                      // Timeout de redemarrage auto
const dictSilenceRef = useRef(null);                      // Timeout de detection de silence
```

### Pourquoi des refs ?
- `dictRecognitionRef` : on doit pouvoir `abort()` l'instance depuis n'importe ou (stop, cleanup)
- `dictRestartRef` / `dictSilenceRef` : les timeouts doivent etre annulables (`clearTimeout`) entre les cycles

---

## 5. Traitement du texte dicte

### Nettoyage d'un element
```js
function cleanItem(text) {
  return text
    .replace(/\s+/g, ' ')              // Espaces multiples -> un seul
    .replace(/^[\s,]+|[\s,]+$/g, '')    // Trim virgules et espaces en debut/fin
    .trim();
}
```

### Decoupage en elements multiples
```js
function splitIntoItems(text) {
  return text
    .split(/[,\n]+|(?:\s+et\s+)/i)    // Separateurs : virgule, saut de ligne, " et "
    .map(s => cleanItem(s))
    .filter(s => s.length > 0);
}
```

Cela permet de dire "pommes, bananes et oranges" et d'obtenir 3 elements separes.

**Adaptations possibles** :
- Changer les separateurs selon le contexte (point-virgule, "puis", etc.)
- Ne pas splitter si l'application attend du texte libre (notes, paragraphes)

---

## 6. Demarrage de la dictee

```js
const startDictation = useCallback(() => {
  if (!SpeechRecognition) return;   // Verifier le support navigateur
  setDictating(true);
  setDictLiveText('');

  const startRec = () => {
    const rec = new SpeechRecognition();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event) => {
      const result = event.results[0];
      const transcript = result[0].transcript.trim();

      if (result.isFinal) {
        // --- Resultat final : traiter le texte ---
        clearTimeout(dictSilenceRef.current);
        const newItems = splitIntoItems(transcript);
        if (newItems.length > 0) {
          setItems(prev => [...prev, ...newItems]);   // Ajouter les elements
        }
        setDictLiveText('');
      } else {
        // --- Resultat intermediaire : afficher en live ---
        setDictLiveText(transcript);
        clearTimeout(dictSilenceRef.current);
        dictSilenceRef.current = setTimeout(() => {
          if (dictRecognitionRef.current) {
            try { dictRecognitionRef.current.stop(); } catch (e) {}
          }
        }, SILENCE_TIMEOUT);
      }
    };

    rec.onerror = (event) => {
      // Ignorer les erreurs benignes
      if (event.error === 'no-speech' || event.error === 'aborted') return;
    };

    rec.onend = () => {
      // Redemarrage automatique tant que la dictee est active
      if (dictRecognitionRef.current) {
        dictRestartRef.current = setTimeout(startRec, 50);
      }
    };

    dictRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      // En cas d'erreur au demarrage, retenter
      dictRestartRef.current = setTimeout(startRec, 100);
    }
  };

  startRec();
}, [setItems]);
```

### Points critiques

1. **Boucle de redemarrage** : `rec.onend` relance automatiquement une nouvelle instance. Cela cree une ecoute continue bien que `continuous = false`. On controle mieux le cycle de vie ainsi.

2. **Detection de silence** : a chaque resultat intermediaire, on arme un timeout de 700ms. Si rien de nouveau n'arrive, on force `rec.stop()` ce qui declenche `onend` -> redemarrage. Cela evite les longs silences.

3. **Delai de redemarrage** : `50ms` entre `onend` et le prochain `start()` pour eviter les conflits d'instance.

4. **Try/catch sur `rec.start()`** : l'API peut lever une exception si une autre instance est encore active. On retente apres 100ms.

---

## 7. Arret de la dictee

```js
const stopDictation = useCallback(() => {
  clearTimeout(dictRestartRef.current);    // Annuler le redemarrage programme
  clearTimeout(dictSilenceRef.current);    // Annuler le timeout de silence
  if (dictRecognitionRef.current) {
    dictRecognitionRef.current.onend = null;  // Empecher le redemarrage auto
    dictRecognitionRef.current.abort();        // Arret immediat (pas stop)
    dictRecognitionRef.current = null;
  }
  setDictating(false);
  setDictLiveText('');
}, []);
```

### Difference entre `stop()` et `abort()`
- `stop()` : arrete l'ecoute mais attend le dernier resultat final -> peut declencher `onresult` puis `onend`
- `abort()` : arret immediat, aucun resultat supplementaire -> on l'utilise pour un arret propre

### Pourquoi mettre `onend = null` avant `abort()` ?
Sans cela, `abort()` declenche `onend`, qui relancerait `startRec()` via le timeout. On coupe cette boucle en supprimant le handler.

---

## 8. Toggle (bouton unique start/stop)

```js
const toggleDictation = useCallback(() => {
  if (dictating) stopDictation();
  else startDictation();
}, [dictating, stopDictation, startDictation]);
```

---

## 9. Interface utilisateur

### Bouton micro
```jsx
<button
  className={`round-btn ${dictating ? 'round-btn-recording' : ''}`}
  onClick={toggleDictation}
>
  <Mic size={20} className={dictating ? 'pulse' : ''} />
</button>
```

- Etat normal : bouton rond noir avec icone micro blanche
- Etat enregistrement : bouton rouge (`#c0392b`) avec animation pulse sur l'icone

### Barre de texte live (apercu en temps reel)
```jsx
{dictating && dictLiveText && (
  <div className="dict-live-bar">{dictLiveText}</div>
)}
```

- Affichee uniquement pendant la dictee ET quand du texte intermediaire existe
- Style : texte centre, italique, couleur doree (`#b87a2a`)
- Disparait des que le resultat est final (texte traite et ajoute)

### Animation pulse
```css
.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

---

## 10. Gestion des erreurs

```js
rec.onerror = (event) => {
  if (event.error === 'no-speech' || event.error === 'aborted') return;
};
```

### Erreurs courantes de l'API
| Erreur          | Signification                              | Action                    |
|-----------------|-------------------------------------------|---------------------------|
| `no-speech`     | Aucun son detecte                         | Ignorer (redemarrage auto)|
| `aborted`       | Arret volontaire (`abort()`)              | Ignorer                   |
| `not-allowed`   | Permission micro refusee                  | Informer l'utilisateur    |
| `network`       | Probleme reseau (API cloud Google)        | Informer l'utilisateur    |
| `audio-capture` | Pas de micro disponible                   | Informer l'utilisateur    |

Dans l'implementation actuelle, seuls `no-speech` et `aborted` sont ignores. Pour une app plus robuste, afficher un message pour les autres erreurs.

---

## 11. Flux complet (diagramme)

```
[Utilisateur appuie sur micro]
        |
  startDictation()
        |
  setDictating(true)
        |
  startRec() --> new SpeechRecognition()
        |            rec.start()
        |
  [Ecoute active]
        |
   onresult (interim)  -->  afficher dictLiveText
        |                    armer SILENCE_TIMEOUT (700ms)
        |
   onresult (final)    -->  splitIntoItems(transcript)
        |                    ajouter au state
        |                    vider dictLiveText
        |
   onend               -->  setTimeout(startRec, 50ms)
        |                    [boucle continue]
        |
  --- OU si silence 700ms ---
        |
   SILENCE_TIMEOUT      -->  rec.stop()
        |                     -> onresult(final) si texte
        |                     -> onend -> restart
        |
  --- OU utilisateur appuie stop ---
        |
  stopDictation()
        |
  clearTimeout (restart + silence)
  rec.onend = null
  rec.abort()
  setDictating(false)
  setDictLiveText('')
```

---

## 12. Checklist pour dupliquer dans une autre app

1. **Verifier le support** : `window.SpeechRecognition || window.webkitSpeechRecognition`
2. **Copier les 3 refs** : `dictRecognitionRef`, `dictRestartRef`, `dictSilenceRef`
3. **Copier les 2 states** : `dictating`, `dictLiveText`
4. **Copier les fonctions** : `startDictation`, `stopDictation`, `toggleDictation`
5. **Adapter `onresult` final** : remplacer `setItems(prev => [...prev, ...newItems])` par l'action souhaitee (ajouter du texte, remplir un champ, etc.)
6. **Adapter `splitIntoItems`** : selon le format de sortie desire (liste, texte libre, commandes...)
7. **Adapter la langue** : changer `rec.lang` si besoin (`en-US`, `es-ES`, etc.)
8. **Ajouter le bouton** avec les classes `round-btn` / `round-btn-recording` et l'animation `pulse`
9. **Ajouter la barre live** conditionnelle `{dictating && dictLiveText && ...}`
10. **HTTPS obligatoire** : l'API SpeechRecognition ne fonctionne qu'en HTTPS (ou localhost)
11. **Permission micro** : le navigateur demandera l'autorisation au premier usage

---

## 13. Limitations connues

- **Navigateurs** : Chrome/Edge (natif), Safari (partiel). Firefox non supporte.
- **Connexion** : necessite une connexion internet (la reconnaissance se fait cote serveur Google/Apple)
- **HTTPS** : obligatoire en production (localhost exempt)
- **Une seule instance** : impossible de lancer 2 `SpeechRecognition` en parallele
- **Timeout navigateur** : Chrome coupe automatiquement apres ~60s d'ecoute continue, d'ou la strategie de redemarrage en boucle
- **Precision** : depend de la qualite du micro, du bruit ambiant et de l'accent
