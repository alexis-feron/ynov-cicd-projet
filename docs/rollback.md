# Procédure de Rollback (Retour à la version N-1)

Cette procédure explique comment effectuer un rollback complet (Frontend et Backend) vers une version précédente (N-1) de l'application en moins de 5 minutes, suite à un déploiement défectueux.

Le processus est automatisé grâce à un workflow GitHub Actions dédié (`rollback.yml`), qui utilise les images Docker pré-existantes (taggées avec le SHA du commit lors de la compilation de la CI), pour une restauration sans temps de reconstruction ("no-build").

## Prérequis

- Avoir accès à l'onglet **Actions** du dépôt GitHub de ce projet.
- Connaître le **commit SHA court** (les 7 premiers caractères de l'identifiant du commit) de la version saine vers laquelle vous souhaitez revenir.

## Étapes à suivre

### 1. Récupérer le SHA de la version N-1 saine

- Allez dans l'historique des commits GitHub (`git log` ou GitHub > Commits).
- Recherchez le commit précédant le déploiement qui a échoué.
- Copiez le SHA court de ce commit (ex: `abc1234`).
- *Astuce :* Vous pouvez également le retrouver en regardant le résumé du workflow **Deploy / CD** précédent qui a réussi.

### 2. Lancer le Workflow de Rollback

- Sur l'interface GitHub, rendez-vous dans l'onglet **Actions**.
- Sur la barre latérale gauche, sous la section "Workflows", sélectionnez **Rollback**.
- En haut à droite de la liste des exécutions, cliquez sur le bouton déroulant **Run workflow**.

### 3. Remplir les paramètres d'exécution

Une modale s'ouvre vous demandant de renseigner trois informations :
- **sha** : Collez le SHA court que vous venez de récupérer (ex: `abc1234`).
- **environment** : Laissez ou sélectionnez l'environnement concerné (ex: `staging`).
- **confirm** : Tapez le mot exact `rollback` (en minuscules) pour valider votre intention et éviter toute erreur de déclenchement.

### 4. Exécuter et valider la restauration

- Cliquez sur le bouton vert **Run workflow**.
- Le système va :
  1. Tirer (pull) les images Docker backend et frontend associées au SHA de version saine (`sha-<votre-sha>`).
  2. Les marquer (tag) en tant qu'images actuelles de l'environnement (ex: `:staging`).
  3. Redémarrer les services avec `docker compose` en utilisant ces images restaurées.
- **L'opération complète prend moins de 5 minutes.**

## Vérification de l'état

À la fin de l'exécution, le workflow inclut une étape pour vérifier que l'environnement est de nouveau en bonne santé ("Verify rollback health"). Il valide que la route `/health` répond un statut HTTP `200`.

En cas de succès, le service a été restauré à la version ciblée.
  
