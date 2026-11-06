# Jeux de données : départements et pays

Généré le 2026-11-06. Validation : `node validate.mjs` (dossier `data`), tout passe.

## Fichiers

- `departements.json` : 101 départements (01-95, 2A, 2B, 971, 972, 973, 974, 976). Champs : code, nom, prefecture, region, regionCode (code INSEE de la région).
- `pays.json` : 195 pays (193 membres de l'ONU + Vatican + Palestine). Champs : code (ISO alpha-2 minuscule), nom, capitale, capitalesAutres (tableau, souvent vide), drapeau (`flags/xx.svg`), continent (interne), statut.
- `flags/` : 195 SVG 4x3, un par pays, plus `LICENSE-flag-icons.txt`.
- `geo/pays.geojson` : propriétés `code` (aligné sur pays.json), `nom`, `statut`.
- `geo/departements.geojson` : propriétés `code`, `nom`. Outre-mer inclus, aux coordonnées réelles (pas de cartouches).
- `scripts/` : scripts de génération (provenance). Les téléchargements bruts (`_raw`) ont été supprimés après génération.

## Sources et licences

| Donnée | Source | Licence |
|---|---|---|
| Départements, préfectures, régions | paquet npm `@etalab/decoupage-administratif` 5.2.0 (INSEE COG, chef-lieu de département résolu vers le nom de commune) | MIT (code), Licence Ouverte Etalab (données INSEE) |
| Formes des départements | github.com/gregoiredavid/france-geojson (`departements-avec-outre-mer.geojson`, dérivé IGN Admin Express), simplifié par mapshaper 0.6.100 (12 %, keep-shapes, précision 0,0001) | Licence Ouverte Etalab 2.0 |
| Formes des pays | Natural Earth 1:50m `admin_0_countries` (via nvkelso/natural-earth-vector), simplifié mapshaper (25 %, keep-shapes, précision 0,01) | Domaine public |
| Drapeaux | npm `flag-icons` 7.2.3 (4x3) | MIT |
| Noms de pays et capitales | Saisie manuelle (orthographe française), relue à la main | Sans objet |

Note : REST Countries (API v3) est dépréciée et renvoyait une erreur, Wikidata n'a pas été interrogé. Les capitales des pays n'ont donc pas de recoupement automatique : elles ont été relues à la main contre les pièges classiques. Les préfectures et régions viennent de l'INSEE (source officielle).

## Décisions

- Alignement codes pays dans le GeoJSON : `ISO_A2_EH` de Natural Earth en priorité (corrige France, Norvège, etc. où `ISO_A2` vaut -99), puis `ISO_A2`. Les 195 pays ont une forme à 50m, y compris les petits États (Monaco, Vatican, Saint-Marin, Tuvalu, etc.), certaines très petites.
- La France dans Natural Earth 50m inclut les DROM dans le même objet : seuls la métropole et la Corse sont conservés dans `pays.geojson`. Antarctique supprimé.
- Le GeoJSON pays contient 41 formes en plus des 195 (territoires, Kosovo `xk`, Taïwan `tw`, Sahara occidental `eh`, Groenland, etc.), propriété `statut = "autre"`. Utiles comme fond de carte, ne pas les interroger.
- Somaliland, Chypre du Nord et glacier de Siachen (sans code ISO) sont supprimés du GeoJSON.
- Continents (champ interne) : Afrique, Amérique du Nord (inclut centrale et Caraïbes), Amérique du Sud, Asie, Europe, Océanie. Russie, Chypre en Europe ; Turquie, Géorgie, Arménie, Azerbaïdjan, Kazakhstan en Asie.
- Noms courts : Congo (Brazzaville) et République démocratique du Congo, Birmanie (Myanmar), Vatican, Palestine, Viêt Nam, Biélorussie, Moldavie, Tchéquie, Macédoine du Nord, Timor oriental, Eswatini, Cap-Vert.
- Capitale la plus courante dans `capitale`, les autres dans `capitalesAutres` :
  - Afrique du Sud : Pretoria (autres Le Cap, Bloemfontein)
  - Bolivie : Sucre (autre La Paz, siège du gouvernement)
  - Côte d'Ivoire : Yamoussoukro (autre Abidjan)
  - Bénin : Porto-Novo (autre Cotonou)
  - Burundi : Gitega (autre Bujumbura, ancienne capitale)
  - Tanzanie : Dodoma (autre Dar es Salaam)
  - Eswatini : Mbabane (autre Lobamba)
  - Guinée équatoriale : Malabo (autre Ciudad de la Paz)
  - Pays-Bas : Amsterdam (autre La Haye, siège du gouvernement)
  - Sri Lanka : Sri Jayawardenapura Kotte (autre Colombo)
  - Malaisie : Kuala Lumpur (autre Putrajaya)
  - Indonésie : Jakarta (autre Nusantara, transfert en cours)
  - Monténégro : Podgorica (autre Cetinje)
  - Yémen : Sanaa (autre Aden)
  - Chili : Santiago (autre Valparaíso, siège du Congrès)
- Ukraine : "Kiev" (usage français courant, officiel en France), Kyiv non utilisé.
- Les 18 régions : 13 métropolitaines (dont Corse) + Guadeloupe, Martinique, Guyane, La Réunion, Mayotte.

## Cas ambigus (non inclus dans pays.json)

- Taïwan (`tw`) : État de fait, non membre ONU, revendiqué par la Chine.
- Kosovo (`xk`) : reconnu par une partie des États, non membre ONU. Pas d'ISO officiel (XK utilisé par convention). Drapeau disponible dans flag-icons.
- Sahara occidental (`eh`), Groenland (`gl`), Îles Féroé, Hong Kong, Macao, Porto Rico, Nouvelle-Calédonie, Polynésie française, etc. : territoires dépendants, forme présente dans le GeoJSON avec statut `autre`.
- Somaliland, Chypre du Nord, Abkhazie, Ossétie du Sud, Transnistrie : non reconnus, absents.
- Ordre de Malte, îles Cook et Niue (États associés à la Nouvelle-Zélande) : non inclus.
- Cas inclus mais sensibles : Palestine (observateur, capitale `Jérusalem-Est` revendiquée, Ramallah en autre), Israël (capitale Jérusalem, statut contesté par une partie de la communauté internationale), Vatican (observateur, capitale "Vatican").
- Statut du champ `statut` : `membre_onu` (193), `observateur` (va, ps), `autre` (réservé aux territoires ajoutés plus tard ; présent seulement dans le GeoJSON pour l'instant).

## Ce qui manque ou à surveiller

- Pas de recoupement automatique des capitales (voir plus haut). À relire si un doute apparaît.
- `drapeau` : chemin relatif à `data/`. Quelques drapeaux flag-icons ont des détails (armoiries) qui rendent mal en petit.
- Géométries simplifiées : les très petits États restent des points minuscules à l'échelle mondiale, prévoir un marqueur ou un zoom dans l'UI.
- `departements.geojson` : DROM à leur position réelle, donc la carte entière est très étendue. Prévoir un affichage en cartouches côté app ou ne montrer que la métropole.
- Aucune donnée de cours de géographie (superficie, population, etc.).
