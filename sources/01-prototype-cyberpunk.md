# Oracle Omni-Système — Prototype v0.2 (tronc commun + Cyberpunk)

Objectif : simuler le MJ en solo (1 PJ, parfois des PNJ compagnons) ou en duo (2 PJ), ou servir d'assistant au MJ. Tout fonctionne avec un d20, l'avantage/désavantage et les omni-points des règles communes. Les tables sont jouables sans écran.

Convention : « d20 » = un dé à 20 faces. Avantage = 2 lancers, on garde le meilleur. Désavantage = 2 lancers, on garde le moins bon.

---

## PARTIE 1 — TRONC COMMUN

### 1. Mise en place
1. Écrire le PJ (et ses PNJ compagnons éventuels) sur la fiche de suivi.
2. **Pression** de départ : 3.
3. **Omni-points** : le PJ en a 3 par mission (cyberpunk / space opéra). L'Oracle (le MJ) commence sans omni-point.
4. Tirer la mission (partie 2, section 6), ou la poser soi-même.

### 2. L'oracle de question
Quand tu ne sais pas si quelque chose est vrai ou arrive, pose une question fermée (oui/non). Choisis la **vraisemblance**, puis lance le d20.

| Vraisemblance | Effet sur le jet |
|---|---|
| Très improbable | Désavantage |
| Improbable | −3 au d20 |
| Incertain | Aucun |
| Probable | +3 au d20 |
| Très probable | Avantage |

| d20 (après modifs) | Réponse |
|---|---|
| 1 ou moins | **Non, et…** (aggravation) |
| 2 à 7 | **Non** |
| 8 à 10 | **Non, mais…** (un élément favorable) |
| 11 à 13 | **Oui, mais…** (un prix ou une complication) |
| 14 à 19 | **Oui** |
| 20 ou plus | **Oui, et…** (un bonus) |

Un 1 ou un 20 **naturel** donne toujours « Non, et… » ou « Oui, et… », quels que soient les modificateurs.

**Interpréter « et » et « mais » :**
- *Oui, mais…* : une complication **mineure** (tirer dans la table Complications, ou inventer).
- *Non, et…* : une complication **majeure** (même table, ou inventer plus dur).
- *Non, mais…* et *Oui, et…* : le joueur invente l'élément favorable.

**Choisir la vraisemblance :** demande-toi ce que ferait un monde cohérent. Si un PNJ est hostile, « m'aide-t-il ? » est improbable. Un doute réel reste « incertain ».

### 3. La Pression (0 à 10)
La Pression mesure à quel point le monde se rebiffe. Plus le PJ domine, plus l'imprévu s'accumule. Elle sert à deux choses : déclencher les scènes altérées (section 4) et durcir les ennemis (section 5).

**Évolution**
- **Départ : 3.** Minimum 0, maximum 10.
- **+1** après une scène où le PJ avait la main (but atteint sans complication notable).
- **−1** après une scène où le PJ a subi (échec critique, blessure de 3 PV ou plus, « Non, et… », complication majeure).
- Elle ne bouge qu'une fois par scène.

**Ce que la Pression implique**

La chance qu'une scène soit altérée est égale à la Pression × 5 %.

| Pression | Chance d'altération | Ce que ça implique |
|---|---|---|
| **0-2 Calme** | 0 à 10 % | Le monde est distrait, personne ne cherche le PJ. Bon moment pour préparer, enquêter, se soigner. Les complications, si elles arrivent, sont des aléas mineurs. |
| **3-4 Vigilance** | 15 à 20 % | Des rumeurs circulent, quelques regards de trop. Les complications sont des gênes (retard, témoin, panne légère). |
| **5-6 Tension** | 25 à 30 % | Les adversaires s'organisent et se parlent. Les complications ont un coût réel (temps perdu, matériel abîmé, contact compromis). |
| **7-8 Étau** | 35 à 40 % | Les ennemis sont enhardis (−2 à leur jet d'intention). Les renforts sont probables, les complications sont majeures. Le rebondissement de la mission est tiré. |
| **9-10 Rupture** | 45 à 50 % | Le monde se referme sur le PJ : plus de répit, chaque scène a une chance sur deux de dérailler. Les complications mettent en jeu l'objectif, les alliés ou la sortie. |

**Seuil de rupture** : la première fois que la Pression atteint 9 dans une mission, l'Oracle gagne **1 omni-point** (une seule fois par mission).

**Soupape** : quand la Pression est à 10 au début d'une scène, cette scène est **automatiquement altérée** (lance quand même un d20 pour savoir si elle est modifiée (pair) ou interrompue (impair)). À la fin de cette scène, la Pression **redescend à 7**, quelle que soit l'issue.

### 4. Les scènes
1. **Prévue** : décris la scène que tu t'attends à jouer (une phrase).
2. Lance un d20. Si le résultat est **inférieur ou égal à la Pression**, la scène est altérée :
   - Résultat **pair** → scène **modifiée** : tire dans la table Complications et ajoute l'élément à ta scène prévue.
   - Résultat **impair** → scène **interrompue** : tire dans la table Complications, et c'est cet événement qui se joue à la place.
   - Adapte la gravité de la complication au palier de Pression (voir tableau de la section 3).
3. Sinon, la scène se joue comme prévu.
4. Joue la scène avec l'oracle de question et les règles d'Omni (jets, combat…).
5. Ajuste la Pression, puis passe à la scène suivante.

### 5. Intentions des ennemis et des PNJ compagnons
L'oracle décide **ce que fait** un adversaire ou un compagnon. Les attaques, dégâts et défenses se résolvent avec les règles communes.

À chaque tour d'un PNJ : lance un d20 et lis la colonne du profil.

**Modificateurs au jet :**
- **+4** si le PNJ a perdu la moitié de ses PV ou plus (sauf Fanatique).
- **−2** si la Pression est de 7 ou plus (le monde est enhardi).

| Profil | 1-4 | 5-8 | 9-12 | 13-16 | 17-20 |
|---|---|---|---|---|---|
| **Brute** | Fonce sur la cible la plus proche | Fonce sur la cible la plus proche | Attaque la cible la plus blessée | Attaque la cible la plus dangereuse | Recule d'un pas et jauge |
| **Tacticien** | Tire ou frappe depuis un couvert | Contourne ou prend en tenaille | Attaque la cible la plus dangereuse | Utilise un équipement (grenade, drone, piratage, implant) | Appelle du renfort ou donne l'alerte |
| **Lâche** | Tire depuis un couvert | Attaque la cible la plus blessée | Recule et se met à l'abri | Appelle du renfort ou donne l'alerte | Fuit ou se rend |
| **Fanatique** | Fonce sur la cible la plus proche | Attaque la cible la plus dangereuse | Attaque la cible la plus dangereuse | Se sacrifie pour frapper (dégâts, risque pour lui) | Utilise un équipement sans retenue |
| **Professionnel** | Tire ou frappe depuis un couvert | Contourne ou prend en tenaille | Attaque la cible la plus blessée | Utilise un équipement | Se replie en bon ordre |
| **Compagnon loyal** | Protège le PJ | Attaque la cible du PJ | Tire depuis un couvert | Aide le PJ (soin, piratage, couverture) | Se replie vers le PJ |
| **Compagnon prudent** | Tire depuis un couvert | Aide le PJ (soin, piratage, couverture) | Se replie | Appelle du renfort ou donne l'alerte | Fuit ou parlemente |
| **Compagnon impulsif** | Fonce sur la cible la plus proche | Fonce sur la cible la plus proche | Attaque la cible la plus dangereuse | Tente une manœuvre risquée | Tire depuis un couvert |

**Réaction d'un PNJ à une proposition ou à une menace :** utilise l'oracle de question. La vraisemblance dépend de son attitude (hostile : improbable ; neutre : incertain ; amical : probable).

### 6. Les omni-points de l'Oracle
- L'Oracle (le « MJ ») commence la mission **sans omni-point**.
- Il en gagne **1 toutes les 2 utilisations** d'omni-points par les joueurs, et **1** la première fois que la Pression atteint 9 dans la mission.
- Il peut en dépenser 1 pour : imposer une complication de son choix, relancer le jet d'un ennemi ou d'un PNJ, ou transformer une réponse « Oui » en « Oui, mais… ».
- Les omni-points du joueur se dépensent comme d'habitude (avec une réplique) pour perturber la narration. Ils servent aussi à **contester** (voir section 8).

### 7. Fiche de suivi (à copier)
- Mission : ______ Scène n° : ___ Pression : ___ /10
- Omni-points PJ : ___ Oracle : ___ Seuil de rupture (9) déjà atteint : ☐
- **Fils ouverts** : (une ligne par intrigue en cours)
- **PNJ** : nom — rôle — attitude (hostile/neutre/amical) — profil — notes
- **Menaces** : qui, quoi, ce qui arrive si on ne fait rien
- **Lieux** : nom — détail marquant
- **Journal** : une ligne par scène (ce qui s'est passé)

### 8. Règles pour le duo
- Les deux joueurs peuvent interroger l'oracle librement.
- **Interprétation** : le joueur qui a posé la question interprète la réponse.
- **Contestation** : l'autre joueur peut dépenser 1 omni-point (avec sa réplique) pour **relancer** la question. Le nouveau résultat remplace l'ancien et ne peut plus être contesté.
- Les scènes et les Pressions sont communes. Chaque PJ a sa propre réserve d'omni-points.
- Si les deux PJ sont séparés, joue les scènes l'une après l'autre, avec la Pression commune.

### 9. Mode assistant du MJ
Avec de vrais joueurs, tu es le MJ et l'oracle t'aide à improviser : lance les tables en secret quand tu manques d'idées (PNJ, complications, rebondissements), utilise l'oracle de question pour les réactions des PNJ, et les intentions pour les ennemis que tu ne veux pas décider toi-même.

---

## PARTIE 2 — VARIANTE CYBERPUNK

### 6. Générer une mission
Tire un d20 dans chacune des tables suivantes (ou choisis). Une mission de **routine** compte 3 à 5 scènes. Une mission **longue ou épique** en compte 8 ou plus.

#### Déroulé suggéré
1. **Accroche** : la scène d'ouverture.
2. **Approche** : le PJ se renseigne, rassemble son matériel, contacte quelqu'un.
3. **Obstacle** : une première difficulté sur le chemin.
4. **Rebondissement** : tiré à mi-parcours, ou quand la Pression atteint 7.
5. **Confrontation** : face à l'antagoniste ou à l'enjeu.
6. **Sortie** : fuite, conséquences, débrief.

#### Clôture
Pose l'oracle de question : « La mission est-elle un succès ? » Choisis la vraisemblance selon le déroulé réel.
- Oui, et… / Oui : succès complet.
- Oui, mais… / Non, mais… : succès partiel.
- Non / Non, et… : échec, avec conséquences.

Applique ensuite la progression d'Omni (mission de routine ou longue). L'Oracle perd ses omni-points restants. Le PJ retrouve ses 3 omni-points pour la mission suivante.

#### T1 — Accroche
| d20 | Résultat |
|---|---|
| 1 | Un contact du PJ disparaît en laissant un message crypté qui appelle à l'aide. |
| 2 | Une mégacorpo propose un contrat bien payé, sans poser de questions, et refuse de nommer son vrai commanditaire. |
| 3 | Le PJ se réveille avec un implant qu'il n'a jamais acheté, et il émet un signal. |
| 4 | Un cadavre inconnu est retrouvé avec une puce portant le nom du PJ. |
| 5 | Un fixeur propose une extraction : sortir quelqu'un d'une tour avant l'aube. |
| 6 | Un drone endommagé s'écrase aux pieds du PJ, la mémoire pleine de données volées. |
| 7 | Un ancien allié refait surface, traqué, et demande refuge pour une nuit. |
| 8 | Un gang prend le contrôle du quartier du PJ et exige une taxe que personne ne peut payer. |
| 9 | Un hacker anonyme propose un casse numérique contre un serveur corpo, payé d'avance. |
| 10 | Une livraison banale tourne mal : le colis se met à émettre un signal. |
| 11 | Une clinique clandestine demande de retrouver un lot d'implants volés avant qu'ils ne soient revendus. |
| 12 | Une IA de quartier appelle à l'aide les seuls habitants qu'elle juge dignes de confiance. |
| 13 | Un journaliste indépendant veut prouver un scandale corpo et cherche une escorte. |
| 14 | Un détail du dernier travail du PJ revient le hanter : un témoin a survécu. |
| 15 | Un ami d'enfance est accusé d'un meurtre qu'il jure ne pas avoir commis. |
| 16 | Une prime est placée sur la tête du PJ, sans qu'il sache pourquoi. |
| 17 | Une panne géante coupe le réseau du secteur, et quelqu'un en profite pour agir. |
| 18 | Un vieux contact paie une dette en offrant un renseignement sur une cache de matériel. |
| 19 | Un robot de sécurité réformé demande de l'aide pour fuir sa corpo. |
| 20 | Une rumeur annonce le transit d'un prototype d'implant révolutionnaire, et tout le monde le veut. |

#### T2 — Objectif
| d20 | Résultat |
|---|---|
| 1 | Récupérer un objet précis (mallette, prototype, disque dur). |
| 2 | Extraire une personne vivante d'un lieu surveillé. |
| 3 | Voler des données sur un serveur isolé. |
| 4 | Neutraliser ou éliminer une cible clairement désignée. |
| 5 | Escorter un convoi ou une personne jusqu'à destination. |
| 6 | Protéger un lieu ou une personne pendant une nuit. |
| 7 | Saboter une installation ou une livraison. |
| 8 | Retrouver quelqu'un qui a disparu. |
| 9 | Livrer un colis sans l'ouvrir et sans se faire intercepter. |
| 10 | Infiltrer un bâtiment ou une soirée pour repérer un détail précis. |
| 11 | Négocier un accord entre deux factions hostiles. |
| 12 | Prouver l'innocence d'un accusé. |
| 13 | Récupérer un implant ou un drone volé. |
| 14 | Piéger un traître dans un groupe allié. |
| 15 | Effacer toute trace d'une opération passée. |
| 16 | Découvrir qui a commandité un événement. |
| 17 | Libérer des prisonniers d'un site corpo. |
| 18 | Rembourser une dette en rendant un service. |
| 19 | Quitter la ville ou le secteur avant une échéance. |
| 20 | Détruire ou enterrer un secret que personne ne doit connaître. |

#### T3 — Lieu
| d20 | Résultat |
|---|---|
| 1 | Une tour mégacorpo : étages inférieurs gardés, étages supérieurs inaccessibles. |
| 2 | Un marché de nuit sous les néons, saturé de vendeurs et d'indics. |
| 3 | Une clinique clandestine dans un sous-sol humide. |
| 4 | Un entrepôt portuaire abandonné au bord d'un canal pollué. |
| 5 | Un hôtel capsule bondé d'inconnus. |
| 6 | Un quartier inondé, praticable seulement à la barque ou les pieds dans l'eau. |
| 7 | Un centre de données refroidi à l'extrême, aux couloirs étroits. |
| 8 | Un bar de mercenaires où tout se négocie. |
| 9 | Un toit-terrasse au-dessus de la ville, venteux et exposé. |
| 10 | Une décharge de pièces cybernétiques où rôdent des charognards. |
| 11 | Un métro désaffecté, éclairé par intermittence. |
| 12 | Un complexe résidentiel corpo qui contrôle chaque porte et chaque caméra. |
| 13 | Une usine automatisée où seuls des robots travaillent. |
| 14 | Un hôpital réquisitionné par une faction. |
| 15 | Une boîte de nuit VIP, avec fouille aux armes à l'entrée. |
| 16 | Un commissariat de quartier corrompu. |
| 17 | Un bidonville vertical accroché au flanc d'une mégastructure. |
| 18 | Un entrepôt frigorifique en bordure de la ville. |
| 19 | Un spatioport de transit, filtré et surveillé. |
| 20 | La matrice : un espace virtuel privé, gardé par des défenses mentales (PV mentaux). |

#### T4 — Antagoniste
| d20 | Résultat |
|---|---|
| 1 | Un cadre de mégacorpo qui veut étouffer une affaire. |
| 2 | Une équipe de mercenaires concurrents sur le même contrat. |
| 3 | Un gang de rue qui contrôle le quartier. |
| 4 | Un hacker légendaire qui joue avec le PJ. |
| 5 | Un ancien allié trahi par le PJ ou par les événements. |
| 6 | Un flic corrompu qui protège un criminel. |
| 7 | Une IA de sécurité qui apprend à se défendre. |
| 8 | Un chirurgien clandestin qui trafique des implants. |
| 9 | Un fixeur double-jeu qui vend les deux camps. |
| 10 | Une secte technologique qui vénère une machine. |
| 11 | Un assassin professionnel envoyé pour couvrir des traces. |
| 12 | Un chef de gang qui veut que rien ne change. |
| 13 | Un inspecteur obstiné, honnête mais mal informé. |
| 14 | Un client qui ment sur la nature de la mission. |
| 15 | Un lieutenant corpo ambitieux qui sabote son propre patron. |
| 16 | Un survivant d'une expérience corpo, désormais instable et dangereux. |
| 17 | Un drone de combat sans maître qui chasse tout ce qui bouge. |
| 18 | Un proche du PJ, manipulé ou soumis au chantage. |
| 19 | Une milice de quartier persuadée de bien faire. |
| 20 | Un adversaire invisible dont on ne verra jamais le visage avant la fin. |

#### T5 — Enjeu
| d20 | Résultat |
|---|---|
| 1 | La vie d'un innocent. |
| 2 | La réputation du PJ dans le quartier. |
| 3 | Une grosse somme d'argent. |
| 4 | La survie d'un contact précieux. |
| 5 | Un secret qui, révélé, bouleverserait un secteur entier. |
| 6 | La liberté du PJ (prison ou prime). |
| 7 | Le fonctionnement d'un implant vital. |
| 8 | Un lien avec une faction (alliance ou rupture). |
| 9 | Un avantage décisif dans une guerre de gangs. |
| 10 | La santé mentale de quelqu'un. |
| 11 | La confiance d'un allié proche. |
| 12 | Une dette qui ne doit pas être réclamée. |
| 13 | La survie d'un quartier entier. |
| 14 | Le contrôle d'un réseau (matrice, trafic). |
| 15 | Une preuve qui peut faire tomber quelqu'un de puissant. |
| 16 | L'accès à un équipement rare. |
| 17 | Un secret personnel du PJ. |
| 18 | La vérité sur la mort de quelqu'un. |
| 19 | Un équilibre fragile entre deux factions. |
| 20 | Une percée technologique qui changerait l'équilibre des pouvoirs. |

#### T6 — Rebondissement
| d20 | Résultat |
|---|---|
| 1 | Le commanditaire a menti : la vraie cible est quelqu'un d'autre. |
| 2 | L'objectif a été détruit ou volé juste avant l'arrivée du PJ. |
| 3 | Un allié du PJ est en réalité un informateur. |
| 4 | La cible est volontaire et refuse d'être sauvée. |
| 5 | L'antagoniste cherche la même chose, pour une bonne raison. |
| 6 | Une troisième faction s'invite avec des moyens supérieurs. |
| 7 | L'objet est un leurre : le vrai est ailleurs. |
| 8 | Le lieu est un piège monté pour le PJ. |
| 9 | Le client prévoit d'éliminer le PJ à la fin du contrat. |
| 10 | Un implant du PJ est piraté à distance. |
| 11 | Le temps imparti est réduit de moitié. |
| 12 | La cible est un proche du PJ. |
| 13 | L'IA du lieu choisit son camp : peut-être celui du PJ, peut-être pas. |
| 14 | Le contact du PJ ne répond plus (plus de renseignements ni de matériel). |
| 15 | Une tempête de réseau coupe les communications : drones et piratage inutilisables un temps. |
| 16 | Une personnalité publique est impliquée. |
| 17 | L'antagoniste propose un marché très tentant. |
| 18 | L'affaire n'est que la couverture d'une autre, plus vaste. |
| 19 | Quelqu'un que le PJ croyait mort réapparaît. |
| 20 | Tout était un test de la corpo pour évaluer le PJ. |

### 7. Complications et événements (table des scènes altérées)
| d20 | Résultat |
|---|---|
| 1 | Une patrouille corpo fait un contrôle d'identité inopiné dans la zone. |
| 2 | Un drone de surveillance repère le PJ et le suit. |
| 3 | Un témoin innocent se retrouve au mauvais endroit au mauvais moment. |
| 4 | Le matériel du PJ lâche au pire moment (arme enrayée, terminal planté, implant qui hoquette). |
| 5 | Un contact appelle en urgence : il est suivi. |
| 6 | Une rixe éclate dans la foule et bloque le passage. |
| 7 | Une coupure de courant plonge le lieu dans le noir. |
| 8 | Un rival du PJ apparaît et se mêle de l'affaire. |
| 9 | Une alarme silencieuse a été déclenchée sans que le PJ le sache. |
| 10 | Un PNJ propose un marché qui paraît trop beau pour être vrai. |
| 11 | La cible change ses plans et part ailleurs. |
| 12 | Un gang réclame un droit de passage. |
| 13 | Un message anonyme prévient le PJ d'un danger, sans détails. |
| 14 | Une explosion dans un bâtiment voisin attire tout le monde. |
| 15 | Un robot de sécurité hors programme patrouille dans un secteur qui devait être vide. |
| 16 | Un implant du PJ est scanné : quelqu'un consulte son profil. |
| 17 | Un ancien ennemi reconnaît le PJ. |
| 18 | Une pluie acide force tout le monde à se mettre à l'abri. |
| 19 | La sécurité ou la police arrive bien plus tôt que prévu. |
| 20 | Une opportunité inattendue : une porte ouverte, un code oublié, un allié providentiel. |

### 8. Générer un PNJ
Tire un d20 dans chacune des trois tables.

#### N1 — Rôle
| d20 | Résultat |
|---|---|
| 1 | Fixeur |
| 2 | Médecin clandestin |
| 3 | Garde corpo |
| 4 | Hacker indépendant |
| 5 | Informateur de rue |
| 6 | Mercenaire |
| 7 | Barman |
| 8 | Flic de quartier |
| 9 | Technicien ou mécano |
| 10 | Cadre corpo |
| 11 | Marchand d'armes |
| 12 | Livreur à moto |
| 13 | Journaliste indépendant |
| 14 | Pilote de drone |
| 15 | Chef de gang |
| 16 | Habitant du quartier qui voit tout |
| 17 | Assassin à gages |
| 18 | Ancien soldat reconverti |
| 19 | Prêtre ou gourou technologique |
| 20 | IA incarnée dans un terminal ou un robot |

#### N2 — Trait
| d20 | Résultat |
|---|---|
| 1 | Méfiant : répond toujours par une question. |
| 2 | Bavard : en dit trop, y compris ce qu'il ne devrait pas. |
| 3 | Cupide : tout a un prix. |
| 4 | Loyal : ne trahit jamais ceux qu'il a choisis. |
| 5 | Nerveux : sursaute au moindre bruit. |
| 6 | Froid et professionnel : va droit au but. |
| 7 | Ironique : tourne tout en dérision. |
| 8 | Fatigué : plus rien ne le surprend. |
| 9 | Ambitieux : cherche à monter, quitte à écraser. |
| 10 | Paranoïaque : voit des pièges partout. |
| 11 | Chaleureux en surface : cache autre chose. |
| 12 | Colérique : s'enflamme pour un rien. |
| 13 | Curieux : pose trop de questions. |
| 14 | Superstitieux : a des rituels pour tout. |
| 15 | Menteur compulsif : arrange la vérité par habitude. |
| 16 | Idéaliste : croit encore pouvoir changer les choses. |
| 17 | Résigné : pense que rien ne sert de lutter. |
| 18 | Arrogant : se croit intouchable. |
| 19 | Effrayé : n'aspire qu'à partir. |
| 20 | Calme de façon inquiétante : ne se trouble jamais. |

#### N3 — Motivation
| d20 | Résultat |
|---|---|
| 1 | Veut de l'argent, et vite. |
| 2 | Veut protéger un proche. |
| 3 | Cherche à se venger. |
| 4 | Veut quitter la ville. |
| 5 | Cherche la reconnaissance de ses pairs. |
| 6 | Doit une dette à quelqu'un de dangereux. |
| 7 | Veut cacher un secret. |
| 8 | Cherche à rejoindre une corpo ou une faction. |
| 9 | Veut faire tomber son patron. |
| 10 | Cherche à réparer ou remplacer un implant défaillant. |
| 11 | Veut connaître la vérité sur un événement passé. |
| 12 | Travaille pour deux camps à la fois. |
| 13 | Veut simplement survivre à la nuit. |
| 14 | Veut impressionner quelqu'un. |
| 15 | Veut racheter une faute. |
| 16 | Cherche à récupérer un objet perdu. |
| 17 | Obéit à un ordre qu'il ne comprend pas. |
| 18 | Veut voler la vedette au PJ. |
| 19 | Veut tester le PJ avant de lui faire confiance. |
| 20 | N'a aucun but précis : il agit au hasard et sème le chaos. |

---

## Notes de test (à remplir après les premières parties)
- Les 6 degrés de l'oracle sont-ils lisibles et assez nuancés ?
- La Pression monte-t-elle ou descend-elle trop vite ? Les paliers (calme, vigilance, tension, étau, rupture) aident-ils à doser les complications ?
- La soupape à 10 (retour à 7) et le gain d'omni-point à 9 fonctionnent-ils bien ?
- Les phrases des tables inspirent-elles ou imposent-elles trop ?
- Les profils d'intention donnent-ils des ennemis crédibles ?
- Manque-t-il des tables (rencontres de rue, boutiques, matrice, hacking, drones…) ?
