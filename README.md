# Bank Accounts API

API REST pour la gestion de comptes bancaires et de leurs lignes de compte (transactions). Chaque utilisateur authentifié gère ses propres comptes et transactions ; solde par compte et solde global calculés par agrégation MongoDB.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Structure du projet](#structure-du-projet)
- [Modèles de données](#modèles-de-données)
- [Authentification](#authentification)
- [Référence de l'API](#référence-de-lapi)
- [Format des erreurs](#format-des-erreurs)
- [Sécurité](#sécurité)
- [CORS](#cors)

## Fonctionnalités

- Inscription et connexion par email/mot de passe, session gérée par JWT.
- Création, consultation, modification et suppression de comptes bancaires.
- Solde par compte et solde global, calculés par agrégation MongoDB.
- Création, consultation, modification et suppression de transactions (lignes de compte).
- Filtrage des transactions en attente (`is_pending: true`).
- Consultation des transactions d'un compte avec le détail du compte parent inclus (`populate`).
- Suppression en cascade : supprimer un compte supprime toutes ses transactions.
- Isolation stricte des données par utilisateur : un utilisateur ne peut voir, modifier ou supprimer que ses propres comptes et transactions.
- Réponses au format HATEOAS (liens d'actions disponibles inclus dans chaque ressource).

## Stack technique

| Composant | Choix |
| --- | --- |
| Runtime | Node.js |
| Framework HTTP | Express |
| Base de données | MongoDB |
| ODM | Mongoose |
| Authentification | JSON Web Token (`jsonwebtoken`) |
| Hachage de mot de passe | `bcryptjs` |
| CORS | `cors` |
| Anti-injection NoSQL | `express-mongo-sanitize` |
| Limitation de débit | `express-rate-limit` |

## Prérequis

- Node.js ≥ 18
- Une instance MongoDB accessible (locale ou distante, ex. MongoDB Atlas)

## Installation

```bash
git clone <url-du-dépôt>
cd synthèse_mongo
npm install
```

## Configuration

Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

| Variable | Obligatoire | Description | Exemple |
| --- | --- | --- | --- |
| `PORT` | Non (défaut `3000`) | Port d'écoute du serveur HTTP | `3000` |
| `MONGO_URI` | Oui | Chaîne de connexion MongoDB | `mongodb://localhost:27017/bank_accounts` |
| `JWT_SECRET` | Oui | Secret utilisé pour signer et vérifier les tokens JWT | `une-chaîne-longue-et-aléatoire` |
| `JWT_EXPIRES_IN` | Non (défaut `1d`) | Durée de validité d'un token | `1d`, `12h` |
| `CORS_ORIGIN` | Non (défaut : toute origine) | Origines autorisées, séparées par des virgules | `https://mon-front.com,http://localhost:5173` |
| `MONGO_SSL` | Non | `true`/`false` pour forcer l'option SSL/TLS de connexion | `true` |

### Le serveur refuse de démarrer si `MONGO_URI` ou `JWT_SECRET` est manquant.

## Démarrage

```bash
npm run dev     # avec rechargement automatique (nodemon)
npm start        # sans rechargement automatique
```

Le serveur affiche `MongoDB connected` puis `Server running on port <PORT>` une fois prêt.

## Structure du projet

```
server.js                          # point d'entrée : chargement de .env, connexion MongoDB, démarrage du serveur HTTP
src/
  app.js                           # application Express : middlewares globaux et montage des routes
  config/
    db.js                          # connexion Mongoose
  models/
    User.js                        # schéma utilisateur
    Account.js                     # schéma compte bancaire
    Transaction.js                 # schéma ligne de compte
  middlewares/
    auth.js                        # authentification par JWT
    checkAccountOwnership.js       # vérifie qu'un compte appartient à l'utilisateur connecté
    checkTransactionOwnership.js   # vérifie qu'une transaction appartient à l'utilisateur connecté
    errorHandler.js                # gestion centralisée des erreurs
  controllers/
    authController.js              # inscription, connexion
    accountController.js           # CRUD comptes, soldes
    transactionController.js       # CRUD transactions, filtres
  routes/
    authRoutes.js
    accountRoutes.js
    transactionRoutes.js
  utils/
    AppError.js                    # erreur applicative typée (message + code HTTP)
    catchAsync.js                  # wrapper pour propager les rejets de promesses à Express
    isNonEmptyString.js            # validation de type sur les champs texte entrants
    methodNotAllowed.js            # réponse 405 pour une méthode HTTP non supportée sur une route existante
    paginate.js                    # normalise page/limit/skip depuis les query params
    isTransactionsUnsupportedError.js # détecte l'erreur MongoDB "transactions non supportées" (mongod standalone)
```

## Modèles de données

### User

| Champ | Type | Contraintes |
| --- | --- | --- |
| `email` | String | Obligatoire, unique |
| `password` | String | Obligatoire, minimum 8 caractères, au moins 1 chiffre et 1 caractère spécial. Haché avant stockage, jamais renvoyé dans les réponses. |
| `createdAt` / `updatedAt` | Date | Générés automatiquement |

### Account

| Champ | Type | Contraintes |
| --- | --- | --- |
| `name` | String | Obligatoire, moins de 50 caractères |
| `user_id` | ObjectId | Obligatoire, référence l'utilisateur propriétaire |
| `createdAt` / `updatedAt` | Date | Générés automatiquement |

### Transaction

| Champ | Type | Contraintes |
| --- | --- | --- |
| `label` | String | Obligatoire, entre 2 et 50 caractères |
| `type` | String | Obligatoire, `"credit"` ou `"debit"` |
| `amount` | Number | Obligatoire, nombre positif (le signe de l'opération est porté par `type`) |
| `date` | Date | Obligatoire |
| `payment_method` | String | Obligatoire, `"Credit Card"`, `"Direct Deposit"`, `"Cash"` ou `"Bank Transfer"` |
| `is_pending` | Boolean | Obligatoire (`true` = à venir, `false` = déjà passée) |
| `category` | String | Obligatoire, `"Food"`, `"Income"`, `"Shopping"`, `"Housing"` ou `"Travel"` |
| `account_id` | ObjectId | Obligatoire, référence le compte parent |
| `createdAt` / `updatedAt` | Date | Générés automatiquement |

## Authentification

Toutes les routes sous `/api/accounts` exigent un token JWT, obtenu via `POST /api/auth/login`, transmis dans l'en-tête :

```
Authorization: Bearer <token>
```

## Référence de l'API

Toutes les réponses sont au format JSON. Les exemples ci-dessous sont réels (champs et structure exacts renvoyés par l'API).

### Auth

#### `POST /api/auth/register`

Crée un nouvel utilisateur.

**Authentification** : aucune

**Corps de la requête**

```json
{
  "email": "Tom@example.com",
  "password": "MotDePasse1!"
}
```

**Réponse `201 Created`**

```json
{
  "status": "success",
  "data": {
    "user": {
      "email": "Tom@example.com",
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "createdAt": "2026-07-23T05:21:34.428Z",
      "updatedAt": "2026-07-23T05:21:34.428Z"
    }
  }
}
```

**Erreurs** : `400` (email/mot de passe manquant ou mot de passe trop faible), `409` (email déjà utilisé)

#### `POST /api/auth/login`

Authentifie un utilisateur et renvoie un token JWT.

**Authentification** : aucune

**Corps de la requête**

```json
{
  "email": "Tom@example.com",
  "password": "MotDePasse1!"
}
```

**Réponse `200 OK`**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Erreurs** : `400` (champs manquants), `401` (identifiants invalides), `429` (trop de tentatives — voir [Sécurité](#sécurité))

### Comptes

#### `POST /api/accounts`

Crée un compte bancaire, automatiquement rattaché à l'utilisateur connecté.

**Authentification** : requise

**Corps de la requête**

```json
{
  "name": "Compte joint"
}
```

**Réponse `201 Created`**

```json
{
  "status": "success",
  "data": {
    "account": {
      "name": "Compte joint",
      "user_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "_id": "665f1a2b3c4d5e6f7a8b9c10",
      "createdAt": "2026-07-23T05:21:54.220Z",
      "updatedAt": "2026-07-23T05:21:54.220Z",
      "_links": {
        "update": { "method": "PUT", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10" },
        "delete": { "method": "DELETE", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10" },
        "create_transaction": { "method": "POST", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10/transactions" },
        "transactions": { "method": "GET", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10/transactions" },
        "pending_transactions": { "method": "GET", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10/transactions/pending" }
      }
    }
  }
}
```

#### `GET /api/accounts`

Liste les comptes de l'utilisateur connecté, chacun avec son solde calculé.

**Authentification** : requise

**Paramètres de requête** (optionnels) : `page` (défaut `1`), `limit` (défaut `50`, max `200`)

**Réponse `200 OK`**

```json
{
  "status": "success",
  "results": 1,
  "page": 1,
  "limit": 50,
  "data": {
    "accounts": [
      {
        "_id": "665f1a2b3c4d5e6f7a8b9c10",
        "name": "Compte joint",
        "user_id": "665f1a2b3c4d5e6f7a8b9c0d",
        "createdAt": "2026-07-23T05:21:54.220Z",
        "updatedAt": "2026-07-23T05:21:54.220Z",
        "balance": 1200,
        "_links": { "...": "..." }
      }
    ]
  }
}
```

#### `GET /api/accounts/global-balance`

Renvoie le solde cumulé de tous les comptes de l'utilisateur connecté.

**Authentification** : requise

**Réponse `200 OK`**

```json
{
  "status": "success",
  "data": { "balance": 1200 }
}
```

#### `PUT /api/accounts/:accountId`

Modifie un compte appartenant à l'utilisateur connecté.

**Authentification** : requise (le compte doit appartenir à l'utilisateur)

**Corps de la requête**

```json
{
  "name": "Nouveau nom"
}
```

**Réponse `200 OK`** : le compte mis à jour, même format que `POST /api/accounts`.

**Erreurs** : `400` (nom manquant), `403` (compte d'un autre utilisateur), `404` (compte inexistant)

#### `DELETE /api/accounts/:accountId`

Supprime un compte et, en cascade, toutes ses transactions, dans une transaction MongoDB (atomique : soit tout est supprimé, soit rien ne l'est). Si la base cible n'est pas un replica set (ex. `mongod` local par défaut), l'opération se rabat automatiquement sur deux suppressions séquentielles.

**Authentification** : requise (le compte doit appartenir à l'utilisateur)

**Réponse `200 OK`**

```json
{
  "status": "success",
  "message": "Account and its transactions deleted successfully"
}
```

### Transactions

Toutes les routes ci-dessous sont imbriquées sous un compte (`:accountId`) et exigent que ce compte appartienne à l'utilisateur connecté.

#### `POST /api/accounts/:accountId/transactions`

Ajoute une transaction sur le compte spécifié.

**Corps de la requête**

```json
{
  "label": "Salaire",
  "type": "credit",
  "amount": 2000,
  "date": "2026-07-01",
  "payment_method": "Direct Deposit",
  "is_pending": false,
  "category": "Income"
}
```

**Réponse `201 Created`**

```json
{
  "status": "success",
  "data": {
    "transaction": {
      "label": "Salaire",
      "type": "credit",
      "amount": 2000,
      "date": "2026-07-01T00:00:00.000Z",
      "payment_method": "Direct Deposit",
      "is_pending": false,
      "category": "Income",
      "account_id": "665f1a2b3c4d5e6f7a8b9c10",
      "_id": "665f1a2b3c4d5e6f7a8b9c20",
      "createdAt": "2026-07-23T05:22:07.641Z",
      "updatedAt": "2026-07-23T05:22:07.641Z",
      "_links": {
        "update": { "method": "PUT", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10/transactions/665f1a2b3c4d5e6f7a8b9c20" },
        "delete": { "method": "DELETE", "href": "/api/accounts/665f1a2b3c4d5e6f7a8b9c10/transactions/665f1a2b3c4d5e6f7a8b9c20" }
      }
    }
  }
}
```

**Erreurs** : `400` (champ obligatoire manquant ou invalide), `403`/`404` (compte non accessible)

#### `GET /api/accounts/:accountId/transactions`

Liste les transactions du compte, avec le solde à jour. Le solde porte toujours sur l'intégralité des transactions du compte, indépendamment de la pagination de la liste.

**Paramètres de requête** (optionnels) : `page` (défaut `1`), `limit` (défaut `50`, max `200`)

**Réponse `200 OK`**

```json
{
  "status": "success",
  "results": 2,
  "page": 1,
  "limit": 50,
  "data": {
    "transactions": ["..."],
    "balance": 1200
  }
}
```

#### `GET /api/accounts/:accountId/transactions/pending`

Liste uniquement les transactions à venir (`is_pending: true`) du compte.

**Paramètres de requête** (optionnels) : `page` (défaut `1`), `limit` (défaut `50`, max `200`)

**Réponse `200 OK`**

```json
{
  "status": "success",
  "results": 1,
  "page": 1,
  "limit": 50,
  "data": { "transactions": ["..."] }
}
```

#### `GET /api/accounts/:accountId/transactions/populated`

Liste les transactions du compte, avec le détail complet du compte parent inclus dans chaque transaction (`account_id` devient un sous-document au lieu d'un simple identifiant).

**Paramètres de requête** (optionnels) : `page` (défaut `1`), `limit` (défaut `50`, max `200`)

**Réponse `200 OK`**

```json
{
  "status": "success",
  "results": 2,
  "page": 1,
  "limit": 50,
  "data": {
    "transactions": [
      {
        "_id": "665f1a2b3c4d5e6f7a8b9c20",
        "label": "Salaire",
        "account_id": {
          "_id": "665f1a2b3c4d5e6f7a8b9c10",
          "name": "Compte joint",
          "user_id": "665f1a2b3c4d5e6f7a8b9c0d",
          "_links": { "...": "..." }
        }
      }
    ]
  }
}
```

#### `PUT /api/accounts/:accountId/transactions/:transactionId`

Modifie une transaction. Tous les champs métier sont modifiables individuellement (mise à jour partielle) ; `account_id` n'est jamais modifiable depuis le corps de la requête.

**Corps de la requête** (partiel, un ou plusieurs champs)

```json
{
  "amount": 2500,
  "is_pending": true
}
```

**Réponse `200 OK`** : la transaction mise à jour, même format que la création.

**Erreurs** : `400` (valeur invalide), `403`/`404` (transaction non accessible)

#### `DELETE /api/accounts/:accountId/transactions/:transactionId`

Supprime une transaction.

**Réponse `200 OK`**

```json
{
  "status": "success",
  "message": "Transaction deleted successfully"
}
```

## Format des erreurs

Toute erreur renvoie un JSON de la forme suivante, avec le code HTTP correspondant :

```json
{
  "status": "fail",
  "message": "Account name is required"
}
```

`status` vaut `"fail"` pour une erreur imputable au client (`4xx`) et `"error"` pour une erreur serveur (`5xx`, message générique renvoyé, jamais de détail interne). Codes utilisés dans l'API :

| Code | Signification |
| --- | --- |
| `400` | Requête invalide (champ manquant, mal typé, validation échouée, JSON malformé) |
| `401` | Authentification manquante, invalide ou expirée |
| `403` | Authentifié mais accès refusé à la ressource (appartient à un autre utilisateur) |
| `404` | Ressource ou route inexistante |
| `405` | Méthode HTTP non supportée sur une route existante (en-tête `Allow` renseigné) |
| `409` | Conflit (ex. email déjà utilisé) |
| `413` | Corps de requête trop volumineux |
| `429` | Trop de tentatives sur `/api/auth` (rate-limiting) |
| `500` | Erreur serveur inattendue |

## Sécurité

- **Mass-assignment** : aucun contrôleur n'assigne `req.body` tel quel à un document. Les champs sensibles (`user_id`, `account_id`, `_id`) sont toujours dérivés du token JWT ou de ressources déjà vérifiées, jamais du corps de la requête.
- **Injection NoSQL** : `express-mongo-sanitize` (middleware global) retire toute clé commençant par `$` ou contenant `.` dans `req.body`/`req.query`/`req.params`, en complément de la validation de type déjà appliquée sur les champs texte (`isNonEmptyString`).!!
- **Force brute** : `/api/auth/register` et `/api/auth/login` sont limités à 20 requêtes / 5 minutes par IP (`express-rate-limit`), au-delà : `429`.
- **Mots de passe** : hachés avec `bcryptjs` (jamais stockés ni renvoyés en clair).
- **JWT** : algorithme épinglé (`HS256`) à la vérification, pas de confiance dans l'algorithme annoncé par le token.
- **Suppression de compte** : transaction MongoDB (atomique) avec repli automatique si la base ne supporte pas les transactions.

## CORS

Les requêtes cross-origin sont autorisées via le middleware `cors`, configurable avec `CORS_ORIGIN` (voir [Configuration](#configuration)). Sans configuration, toute origine est acceptée.