# Design System - KeepNote

Guide de design complet pour reproduire l'identite graphique de l'application.

---

## 1. Fondations

### Typographie
- **Font family** : `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Tailles** :
  - Titre principal (badge) : `1.15rem`, weight `600`
  - Titres de section / onglets : `0.85rem`, weight `600` (actif) / `500` (inactif)
  - Texte courant (labels, items) : `0.95rem`
  - Texte secondaire (hints, sous-titres) : `0.78rem` - `0.82rem`
  - Boutons textuels : `0.8rem` - `0.9rem`, weight `600`

### Palette de couleurs

#### Mode clair
| Role                  | Couleur     |
|-----------------------|-------------|
| Background page       | `#f5f5f7`   |
| Texte principal       | `#1a1a1a`   |
| Surface (cartes)      | `#fff`      |
| Bordure cartes        | `#ddd`      |
| Bordure separateurs   | `#eee`      |
| Texte secondaire      | `#999`      |
| Texte desactive       | `#aaa`      |
| Texte moyen           | `#666`      |
| Hover surface         | `#f0f0f2`   |
| Accent succes         | `#27ae60`   |
| Accent danger         | `#c0392b`   |
| Danger hover          | `#e74c3c`   |
| Danger fond           | `#fdf2f2`   |
| Danger bordure        | `#e0a0a0` / `#e0b0b0` |
| Accent info/live      | `#b87a2a`   |
| Barre de nav fond     | `#1a1a1a`   |
| Nav item inactif      | `#888`      |
| Nav item hover        | `#ccc`      |
| Nav bouton add        | `#333` (hover `#555`) |

#### Mode sombre
| Role                  | Couleur     |
|-----------------------|-------------|
| Background page       | `#131316`   |
| Texte principal       | `#d5d5da`   |
| Surface (cartes)      | `#1e1e23`   |
| Bordure cartes        | `#2c2c33`   |
| Bordure separateurs   | `#28282f`   |
| Texte secondaire      | `#7a7a82`   |
| Texte desactive       | `#4e4e56`   |
| Texte moyen           | `#9a9aa0`   |
| Hover surface         | `#252530`   |
| Accent succes         | `#2ecc71`   |
| Accent danger         | `#e06050`   |
| Danger fond           | `#261818`   |
| Danger bordure        | `#4a2828`   |
| Accent info/live      | `#d4a044`   |
| Barre de nav fond     | `#28282f`   |
| Nav item inactif      | `#7a7a82`   |
| Nav item hover        | `#b0b0b6`   |
| Nav item actif fond   | `#0c0c0e`   |
| Nav bouton add        | `#3a3a42` (hover `#4a4a52`) |
| Boutons ronds         | `#0c0c0e` (hover `#1a1a1f`) |
| Titre badge fond      | `#0c0c0e`   |

### Theme color (meta)
- Clair : `#f5f5f7`
- Sombre : `#131316`

---

## 2. Layout general

- **Conteneur principal** : `max-width: 500px`, centre (`margin: 0 auto`)
- **Padding conteneur** : `12px 16px`
- **Hauteur** : `100dvh` (fallback `100vh`)
- **Direction** : `flex-direction: column`
- **Gap entre sections** : `6px`
- **Overflow** : `hidden` (le scroll se fait dans la zone de liste uniquement)
- Les scrollbars sont masquees partout (`scrollbar-width: none`)

### Ordre des sections (de haut en bas)
1. Barre de titre (centree, avec toggle theme a gauche)
2. Barre de navigation horizontale (onglets scrollables)
3. Zone de liste principale (prend tout l'espace restant, `flex: 1`)
4. Barre de dictee live (conditionnelle)
5. Boutons d'action en bas

---

## 3. Composants

### 3.1 Badge titre
- **Style** : `inline-block`, fond `#1a1a1a`, texte `#fff`
- **Bordure** : `3px solid #1a1a1a`
- **Border-radius** : `24px`
- **Padding** : `8px 28px`
- **Font** : `1.15rem`, weight `600`
- Aspect "pilule" arrondie

### 3.2 Bouton toggle theme
- Position absolue a gauche dans la barre de titre
- Icone seule (Sun/Moon, `18px`)
- Couleur : `#999` (hover `#1a1a1a`)
- Background hover : `rgba(0,0,0,0.06)`
- `border-radius: 50%`, padding `6px`

### 3.3 Barre de navigation horizontale (onglets)
- **Conteneur** : fond `#1a1a1a`, `border-radius: 24px`, padding `6px 10px`
- **Scroll** : `overflow-x: auto`, scrollbar masquee
- **Gap entre onglets** : `8px`
- **Onglet inactif** :
  - Background transparent, couleur `#888`
  - Font `0.85rem`, weight `500`
  - Padding `6px 14px`, `border-radius: 16px`
- **Onglet actif** :
  - Background `#fff`, couleur `#1a1a1a`
  - Font weight `600`
- **Bouton ajouter (+)** :
  - Rond, `28x28px`, `border-radius: 50%`
  - Fond `#333`, icone blanche
- **Input nouveau nom** :
  - Fond `#333`, texte blanc, `border-radius: 16px`
  - Padding `6px 12px`, largeur `100px`
- Transitions : `background 0.15s, color 0.15s`

### 3.4 Carte / Section principale
- **Background** : `#fff`
- **Border-radius** : `20px`
- **Bordure** : `3px solid #ddd`
- **Padding** : `14px 16px`
- **Layout** : `flex-direction: column`, `flex: 1`, `overflow: hidden`
- Le contenu scrollable est a l'interieur (`overflow-y: auto`)

### 3.5 En-tete de section
- **Layout** : `flex`, `justify-content: space-between`, `align-items: center`
- **Titre (h2)** : `0.85rem`, weight `600`, couleur `#1a1a1a`
  - Meme style que les onglets actifs
- **Bouton "Tout effacer"** :
  - Bordure `1px solid #e0b0b0`, couleur `#c0392b`
  - Padding `5px 12px`, `border-radius: 6px`
  - Hover : fond `#c0392b`, texte blanc
  - Icone + texte, gap `5px`

### 3.6 Item de liste
- **Layout** : `flex`, `align-items: center`
- **Padding** : `11px 0`
- **Separateur** : `border-bottom: 1px solid #eee` (sauf dernier)
- **Ordre des elements** :
  1. Handle de drag (GripVertical `16px`)
  2. Checkbox (`18x18px`)
  3. Label texte (`flex: 1`, `0.95rem`)
  4. Bouton editer (Pencil `14px`)
  5. Bouton supprimer (X `16px`)
- **Checkbox** :
  - `accent-color: #27ae60` (clair)
  - En dark mode : apparence custom, fond `#28282f`, bordure `#606068`, checked = `#2ecc71` avec coche en CSS
- **Item coche** :
  - Label : `text-decoration: line-through`, couleur `#aaa`
- **Boutons d'action** :
  - Couleur `#ccc`, hover edit `#1a1a1a`, hover delete `#e74c3c`
  - Padding `0 4px`
- **Handle de drag** :
  - Couleur `#ccc`, margin-right `10px`
  - `cursor: grab` (active: `grabbing`, couleur `#888`)
  - `user-select: none`, `touch-action: none`

### 3.7 Ghost de drag
- Fond blanc, `border-radius: 8px`
- `box-shadow: 0 8px 24px rgba(0,0,0,0.12)`
- `opacity: 0.95`
- L'item source passe a `opacity: 0.2`

### 3.8 Input d'edition / ajout
- **Pas de bordure** sauf `border-bottom: 2px solid #1a1a1a`
- Background transparent
- Font `0.95rem`, font-family `inherit`
- Couleur `#1a1a1a`

### 3.9 Boutons ronds (barre du bas)
- **Taille** : `48x48px`
- **Border-radius** : `50%`
- **Fond** : `#1a1a1a`, texte blanc
- **Hover** : `#333`
- **Gap entre boutons** : `16px`
- **Etat enregistrement** : fond `#c0392b` (hover `#e74c3c`)
- Layout : `flex`, `justify-content: center`
- Icones : `20px`

### 3.10 Barre de dictee live
- Texte centre, italique
- Couleur `#b87a2a`
- Font `0.82rem`
- Padding `4px 12px`

### 3.11 Popup de confirmation (modale)
- **Overlay** : `position: fixed`, fond `rgba(0,0,0,0.4)`
- **Popup** :
  - Fond blanc, `border-radius: 16px`, padding `24px`
  - `max-width: 320px`, largeur `90%`
  - Texte centre
- **Texte principal** : `0.95rem`
- **Texte hint** : `0.8rem`, couleur `#999`
- **Boutons** :
  - Layout flex, gap `10px`, `flex: 1` chacun
  - `border-radius: 10px`, padding `10px`
  - Font `0.9rem`, weight `600`
  - Annuler : fond blanc, bordure `#ddd` (hover `#f0f0f2`)
  - Supprimer : fond `#c0392b` (hover `#a93226`), texte blanc

### 3.12 Message d'erreur
- Fond `#fdf2f2`, texte `#c0392b`
- Bordure `1px solid #f0c4c4`
- `border-radius: 8px`, padding `12px 16px`
- Font `0.85rem`

---

## 4. Animations et transitions

- **Transitions globales** : `0.15s` sur `background`, `color`, `border-color`
- **Items de liste** : `transform 0.2s ease, opacity 0.2s ease`
- **Animation pulse** (micro actif) :
  ```css
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  /* duration: 1.5s, ease-in-out, infinite */
  ```

---

## 5. Border-radius recapitulatif

| Element                  | Radius |
|--------------------------|--------|
| Badge titre              | `24px` |
| Barre de navigation      | `24px` |
| Onglet                   | `16px` |
| Carte / section          | `20px` |
| Popup de confirmation    | `16px` |
| Boutons textuels         | `6px` - `10px` |
| Boutons ronds            | `50%`  |
| Ghost de drag            | `8px`  |
| Message d'erreur         | `8px`  |
| Checkbox (dark custom)   | `4px`  |

---

## 6. Bordures recapitulatif

| Element                  | Bordure              |
|--------------------------|----------------------|
| Carte / section          | `3px solid #ddd`     |
| Badge titre              | `3px solid #1a1a1a`  |
| Separateur item          | `1px solid #eee`     |
| Bouton danger            | `1px solid #e0b0b0`  |
| Bouton annuler           | `1px solid #ddd`     |
| Input keyword            | `2px solid #ddd`     |
| Input edition            | `border-bottom: 2px solid #1a1a1a` |

---

## 7. Icones

- **Librairie** : `lucide-react`
- **Tailles utilisees** : `12px`, `14px`, `16px`, `18px`, `20px`
- **Icones utilisees** :
  - `Mic` (micro / dictee)
  - `GripVertical` (handle drag)
  - `X` (fermer / supprimer)
  - `Trash2` (tout effacer)
  - `Pencil` (editer)
  - `Plus` (ajouter)
  - `Share2` (partager)
  - `Sun` / `Moon` (toggle theme)

---

## 8. Principes de design

1. **Mobile-first** : conteneur `max-width: 500px`, pensee pour ecran tactile
2. **Minimalisme** : fond neutre, surfaces blanches, pas de decoration superflue
3. **Contraste fort** : fond noir (`#1a1a1a`) pour les elements de navigation et boutons d'action
4. **Arrondis genereux** : entre `16px` et `24px` pour les conteneurs principaux
5. **Bordures epaisses** : `3px` pour les cartes et elements structurants
6. **Feedback subtil** : transitions rapides (`0.15s`), hover discrets
7. **Dark mode complet** : chaque element a sa variante sombre, jamais de blanc pur en dark
8. **Scrollbars masquees** : experience epuree, scroll natif sans barre visible
9. **Icones sobres** : style "outline" (lucide), tailles coherentes
10. **Danger en rouge** : actions destructives en `#c0392b` avec confirmation modale
