# Explora World

Remplis ta carte du monde. Touche un pays pour zoomer dedans, puis marque chaque département, état ou région où tu es allé.

- 4 onglets : Carte, Progrès, Voyages, Réglages
- thème Auto, Clair ou Sombre
- % du monde découvert (calculé sur la surface des régions explorées)
- nombre de pays visités (sur 195) et de régions explorées
- progression par pays (ex. « 12 / 101 départements »)
- recherche de pays et de régions
- position en direct : la carte te place et sélectionne la région où tu te trouves
- installable sur l'écran d'accueil et utilisable hors ligne (PWA)

Les marquages sont enregistrés sur l'appareil (localStorage).

## Structure

| Fichier | Contenu |
|---|---|
| `index.html` | structure de l'appli et des 4 onglets |
| `css/app.css` | styles, thèmes clair et sombre |
| `js/app.js` | carte, marquage, progrès, voyages, réglages, position |
| `data/` | frontières simplifiées (Natural Earth : pays 1:50m, régions 1:10m) |
| `vendor/` | d3 7.9.0 et topojson-client 3.1.0 |
| `sw.js`, `manifest.webmanifest`, `icons/` | installation et mode hors ligne |

Aucune étape de build : les fichiers sont servis tels quels.

## Lancer en local

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

## Mettre en ligne

GitHub → Settings → Pages → Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
Le service worker passe d'abord par le réseau : l'appli prend toujours la dernière version quand il y a du réseau.

## Feuille de route

1. Compte utilisateur et synchronisation entre appareils (ex. Supabase ou Firebase).
2. Applis Android et iOS avec [Capacitor](https://capacitorjs.com) : le même code web est emballé dans une appli native, avec la géolocalisation native en arrière-plan.
3. Publication sur Google Play et l'App Store.

Données cartographiques : [Natural Earth](https://www.naturalearthdata.com) (domaine public).
