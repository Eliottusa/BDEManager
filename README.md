# BDE Manager

Une plateforme moderne de gestion d'événements pour les Bureaux des Étudiants (BDE).

## 🚀 Fonctionnalités

- **🌐 Internationalisation** : Support complet Français / Anglais.
- **🔐 Authentification** : Système complet avec rôles (USER, ORGANIZER, ADMIN).
- **📅 Gestion d'Événements** : Création, modification et affichage des événements avec autocomplétion d'adresse.
- **🎫 Billetterie & Inscriptions** : Inscription aux événements avec gestion des places et paiements (Stripe).
- **📱 Dashboard & Notifications** : Suivi des inscriptions et notifications en temps réel (Socket.io).
- **🧑‍💻 Mode Mock** : Développez le frontend sans backend grâce à un système de simulation intégré.

## 🛠 Stack Technique

- **Frontend** : Next.js 15 (App Router), TypeScript, Tailwind CSS, next-intl, Axios.
- **Backend** : NestJS, PostgreSQL (Prisma), MongoDB (Mongoose), Redis, Socket.io.
- **Paiements** : Stripe.

## 📥 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/votre-repo/bdemanager.git
cd bdemanager
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
Copiez le fichier `.env.example` en `.env` à la racine et dans `apps/web/.env.local`.

### 4. Lancer le projet en mode développement
```bash
# Lancer tout le projet (API + Web)
npm run dev

# Lancer uniquement le web (avec mode Mock)
cd apps/web
npm run dev
```

## 🧪 Mode Mock (Frontend)

Pour travailler sur le frontend sans que l'API ne soit lancée, activez le mode Mock dans `apps/web/.env.local` :
```env
NEXT_PUBLIC_MOCK_AUTH=true
```
Ce mode simule :
- Un utilisateur connecté par défaut.
- Des listes d'événements et des inscriptions factices.
- Des succès sur les formulaires de création et d'inscription.

## 📁 Structure du Projet

- `apps/api` : Serveur NestJS (API REST & WebSockets).
- `apps/web` : Application Next.js (Client).
- `packages/` : Partage de configurations et types (à venir).

## 📝 License

Distribué sous la licence MIT.
