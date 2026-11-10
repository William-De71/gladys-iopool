# iopool

## Présentation

Cette intégration amène dans Gladys les bassins de votre compte **iopool** (sonde iopool EcO) :

- un appareil par bassin : température de l’eau, pH, redox (ORP), durée de filtration quotidienne recommandée par iopool, action demandée ou non par iopool sur l’eau, et mode du bassin (standard, remise en route, hivernage actif ou passif) ;
- des déclencheurs de scène (nouvelle mesure, action requise ou résolue, mode du bassin changé, conseil de filtration changé, aucune mesure depuis 24 heures) et une action de scène (lire un bassin) ;
- un widget de tableau de bord « Eau de la piscine ».

iopool n’a pas d’API locale : la sonde envoie ses mesures au cloud iopool, et l’intégration les lit par l’**API publique officielle d’iopool**, en lecture seule, avec la clé API de votre compte (transport cloud). La clé ne part que vers `api.iopool.com`.

![Widget Eau de la piscine, un bassin équilibré et un bassin pour lequel iopool demande une action (illustration générée, pas une capture d’écran)](https://raw.githubusercontent.com/William-De71/gladys-iopool/main/docs/assets/widgets.fr.png)

## Prérequis

- Gladys Assistant 5.3.0 ou plus récent.
- Une sonde iopool EcO qui fonctionne déjà dans l’application mobile iopool.
- La clé API de votre compte iopool : dans l’application iopool, ouvrez les **Paramètres** ; la clé est tout en bas de la page.

## Configuration

1. Intégrations → iopool → Configuration.
2. Collez la clé API, puis enregistrez.

| Champ                       | Description                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Clé API                     | La clé de l’application iopool (Paramètres, tout en bas), enregistrée comme secret et jamais réaffichée.           |
| Intervalle de lecture (min) | De 5 à 60 minutes, 10 par défaut. La sonde mesure environ une fois par heure : inutile d’aller plus vite.          |
| Langue des textes           | Noms des fonctionnalités, modes du bassin et résumés des scènes. Automatique : la langue de votre tableau de bord. |

**Tester la clé API** lit l’API iopool et indique combien de bassins compte le compte.

## Utilisation

### Appareils

Appareils → iopool → **Découvrir**, puis ajoutez votre bassin (« iopool Jardin », d’après le nom donné dans l’application iopool). Ses valeurs apparaissent aussitôt.

| Fonctionnalité         | Type Gladys                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| Température de l’eau   | Capteur de température, °C                                                        |
| pH                     | Capteur de pH                                                                     |
| Redox (ORP)            | Capteur ORP, mV                                                                   |
| Filtration recommandée | Durée, minutes par jour (iopool suit la température de l’eau)                     |
| Action requise         | Texte : « Action requise » ou « Rien à faire », comme le dit l’application iopool |
| Mode du bassin         | Texte : standard, remise en route, hivernage actif ou passif                      |

L’API iopool est en lecture seule : rien ne se pilote depuis Gladys. Pour commander la pompe, utilisez une prise ou un relais connecté avec le conseil de filtration.

### Scènes

Déclencheurs :

- **iopool : nouvelle mesure** : chaque nouvelle mesure, avec ses valeurs en variables (et si iopool l’a validée).
- **iopool : action requise** : l’application iopool se met à demander une action sur l’eau, ou n’en demande plus. Filtrez sur « Une action est requise » pour une alerte.
- **iopool : mode du bassin changé** : standard, remise en route, hivernage actif ou passif.
- **iopool : conseil de filtration changé** : la durée quotidienne recommandée a changé ; sa valeur en minutes et en heures en variables.
- **iopool : mesures interrompues** : aucune mesure depuis 24 heures (pile, Wi-Fi, passerelle). Déclenché une fois, jamais en hivernage passif.

Action :

- **iopool : lire un bassin** : température, pH, redox, filtration recommandée, action requise, mode du bassin et une phrase toute prête.

Exemples :

- Quand iopool demande une action → envoyer un message avec `{{triggerEvent.data.summary}}`.
- Quand le conseil de filtration change → adapter la durée d’allumage de la prise de la pompe.
- Chaque soir à 20 h → lire le bassin, puis envoyer son résumé.

### Widget

Tableau de bord → Modifier → ajoutez **Eau de la piscine**. Choisissez le bassin, le graphique (température, pH, redox, filtration ou aucun) et sa période. Le graphique affiche l’historique que garde Gladys : il apparaît dès que l’appareil du bassin est ajouté. Les tuiles ne sont pas colorées : iopool ne publie pas ses plages idéales, le widget reprend donc ce que dit iopool (« Action requise ») plutôt que de deviner.

## Dépannage

- **« iopool a refusé la clé API »** : recopiez-la depuis l’application iopool (Paramètres, tout en bas), sans espace.
- **Aucun appareil dans Découvrir** : le compte n’a pas encore de bassin, ou iopool n’a pas encore été lu : utilisez « Tester la clé API ».
- **« Pas encore de mesure »** : la sonde est encore en cours d’initialisation ; les valeurs arrivent avec sa première mesure.
- **Valeurs un peu en retard** : la sonde mesure environ une fois par heure, et l’intégration lit l’API toutes les 10 minutes par défaut.
- **« L’API iopool ne répond pas » ou « iopool limite les requêtes »** : l’intégration réessaie à la lecture suivante.
- **Logs** : ajoutez la variable d’environnement `DEBUG=gladys-integration-sdk`, puis ouvrez une issue sur [GitHub](https://github.com/William-De71/gladys-iopool/issues) avec les versions de Gladys et de l’intégration et les logs (la clé API n’y apparaît jamais).
