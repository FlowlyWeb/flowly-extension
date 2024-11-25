# 🎯 Guide d'Installation BigBlueButton 2.6 sur VirtualBox pour le développement

## 📋 Prérequis Détaillés
- VirtualBox installé sur votre machine host
- Image Ubuntu Server 20.04.4 LTS ([Téléchargement](https://old-releases.ubuntu.com/releases/20.04.4/))
- Un nom de domaine configuré avec accès aux paramètres DNS
- Accès à la configuration de votre routeur pour la redirection de ports
- Minimum 8GB RAM disponible
- Minimum 4 cœurs CPU
- Minimum 50GB espace disque

## 🚀 1. Configuration de VirtualBox

### Configuration Détaillée de la VM
1. Ouvrir VirtualBox
2. Cliquer sur "Nouvelle"
3. Configuration de base :
    - Nom : Ubuntu-SSH (ou nom de votre choix)
    - Type : Linux
    - Version : Ubuntu 64-bit
    - RAM : 8GB (8192 MB) - Important pour les performances
    - CPU : 4 cores minimum - Nécessaire pour le traitement vidéo
    - Disque dur : 50GB minimum - Pour le système et les enregistrements

### 🔌 Configuration Réseau Détaillée
1. Dans les paramètres de la VM :
    - Onglet "Réseau"
    - Adapter 1 : Mode Bridge
    - Pourquoi Bridge ? Permet à la VM d'avoir sa propre adresse IP sur le réseau local

2. Configuration des ports nécessaires :
```plaintext
# Ports requis :
80   (HTTP)  - Pour le trafic web non sécurisé
443  (HTTPS) - Pour le trafic web sécurisé
16384-32768 (UDP) - Pour WebRTC (audio/vidéo)
```

## 💻 2. Installation Ubuntu Server

### Préparation
1. Monter l'ISO Ubuntu Server 20.04.4
2. Démarrer la VM

### Configuration Initiale
1. Sélection de la langue :
    - Choisir English (facilite le support)

2. Configuration du clavier :
    - Sélectionner votre disposition

3. Configuration réseau :
    - DHCP par défaut pour l'installation
    - Nous configurerons une IP statique plus tard

4. Configuration du stockage :
    - Utiliser le disque entier
    - Configuration LVM par défaut

5. Configuration du profil :
```plaintext
Nom : Votre nom complet
Nom serveur : bbb-server
Username : user (ou votre choix)
Password : Choisir un mot de passe fort
```

## 🛠️ 3. Configuration Post-Installation

### Configuration IP Statique
Pourquoi ? Une IP statique est nécessaire pour la stabilité du service.

1. Identifier l'interface réseau :
```bash
ip a
# Noter le nom (généralement enp0s3)
```

2. Configurer netplan :
```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

3. Configuration réseau :
```yaml
network:
  version: 2
  ethernets:
    enp0s3:    # Votre interface réseau
      dhcp4: no
      addresses:
        - 192.168.1.20/24    # IP statique choisie
      gateway4: 192.168.1.1   # Votre passerelle
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]    # Serveurs DNS Google
```

4. Appliquer et vérifier :
```bash
sudo netplan try    # Test de la configuration
sudo netplan apply  # Application permanente
```

## 📦 4. Installation des Composants

### Configuration des Volumes Docker Persistants
Pourquoi ? Pour conserver les données entre les redémarrages.

```bash
# Créer les volumes persistants
sudo docker volume create greenlight-postgres-data
sudo docker volume create greenlight-redis-data
```

### Script de Démarrage Automatique
1. Créer le script :
```bash
sudo nano /usr/local/bin/start-bbb.sh
```

2. Contenu du script (avec explications) :
```bash
#!/bin/bash

# Attente du réseau
echo "Attente de la disponibilité réseau..."
sleep 30

# Services fondamentaux
echo "Démarrage des services de base..."
systemctl start docker       # Pour les containers
systemctl start mongod      # Base de données pour BBB
systemctl start redis-server # Cache pour BBB

# Services web
echo "Démarrage des services web..."
systemctl start nginx    # Serveur web frontal
systemctl start haproxy  # Load balancer et SSL termination

# Configuration réseau Docker
echo "Configuration Docker..."
docker network create bbb-network 2>/dev/null || true

# Base de données PostgreSQL
echo "Démarrage PostgreSQL..."
docker run -d \
    --name postgres \
    --network bbb-network \
    --restart unless-stopped \
    -v greenlight-postgres-data:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_USER=greenlight \
    -e POSTGRES_DB=greenlight_production \
    postgres:14.6-alpine3.17

echo "Attente initialisation PostgreSQL..."
sleep 10

# Redis pour le cache
echo "Démarrage Redis..."
docker run -d \
    --name redis \
    --network bbb-network \
    --restart unless-stopped \
    -v greenlight-redis-data:/data \
    redis:6.2-alpine3.17

echo "Attente initialisation Redis..."
sleep 5

# Interface Greenlight
echo "Démarrage Greenlight..."
BBB_SECRET=$(bbb-conf --secret | grep -oP '(?<=Secret: ).+$')
docker run -d \
    --name greenlight-v3 \
    --network bbb-network \
    --restart unless-stopped \
    -p 127.0.0.1:5050:3000 \
    -e DATABASE_URL="postgres://greenlight:password@postgres/greenlight_production" \
    -e REDIS_URL="redis://redis:6379" \
    -e SECRET_KEY_BASE="$(openssl rand -hex 64)" \
    -e BIGBLUEBUTTON_URL="https://bbb.votredomaine.com/bigbluebutton/" \
    -e BIGBLUEBUTTON_SECRET="$BBB_SECRET" \
    bigbluebutton/greenlight:v3

# Composants BBB
echo "Démarrage des composants BBB..."
services=(
    "bbb-web"              # API et backend
    "bbb-apps-akka"        # Gestion des conférences
    "bbb-fsesl-akka"       # Interface FreeSWITCH
    "freeswitch"           # Serveur VoIP
    "bbb-webrtc-sfu"       # Gestion WebRTC
    "bbb-html5"            # Interface utilisateur
    "etherpad"             # Éditeur collaboratif
    "bbb-pads"             # Notes partagées
    "bbb-export-annotations" # Export des annotations
    "bbb-rap-caption-inbox"  # Sous-titres
    "bbb-rap-resque-worker" # Traitement des enregistrements
    "bbb-rap-starter"       # Démarrage des enregistrements
)

for service in "${services[@]}"; do
    echo "Démarrage $service..."
    systemctl start $service
done

echo "Démarrage BBB terminé !"
```

### Configuration du Service Systemd
1. Créer le fichier service :
```bash
sudo nano /etc/systemd/system/bbb-startup.service
```

2. Contenu :
```ini
[Unit]
Description=BigBlueButton Startup Script
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/start-bbb.sh
RemainAfterExit=yes
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

3. Activer le service :
```bash
sudo chmod +x /usr/local/bin/start-bbb.sh
sudo systemctl daemon-reload
sudo systemctl enable bbb-startup
```

## 🌐 5. Configuration DNS et Routeur

### Configuration DNS
1. Accéder à votre gestionnaire DNS
2. Créer un enregistrement A :
    - Nom : bbb (ou sous-domaine choisi)
    - Type : A
    - Valeur : Votre IP publique
    - TTL : 3600

### Configuration Routeur
1. Accéder à l'interface de votre routeur
2. Configurer les redirections :
```plaintext
Port 80   → 192.168.1.20:80
Port 443  → 192.168.1.20:443
Ports UDP 16384-32768 → 192.168.1.20:16384-32768
```

## ✅ 6. Vérification et Maintenance

### Commandes de Vérification
```bash
# État des services
sudo bbb-conf --status

# Liste des containers Docker
sudo docker ps

# Logs en temps réel
sudo journalctl -fu bbb-startup

# Version de BBB
sudo bbb-conf --check
```

### Gestion des Utilisateurs Greenlight
```bash
# Lister les utilisateurs
sudo docker exec -it greenlight-v3 bundle exec rake user:list

# Créer un admin
docker exec -it greenlight-v3 bundle exec rake admin:create['name','email','password']

# Supprimer un utilisateur
sudo docker exec -it greenlight-v3 bundle exec rake user:delete["email@example.com"]
```

## 🔧 7. Dépannage

### Problèmes Courants et Solutions

1. Erreur 502 Bad Gateway :
```bash
# Vérifier les logs nginx
sudo tail -f /var/log/nginx/error.log

# Redémarrer les services web
sudo systemctl restart nginx haproxy
```

2. Problèmes de connexion :
```bash
# Vérifier les ports
sudo netstat -tulpn

# Vérifier les certificats SSL
sudo certbot certificates
```

3. Problèmes de démarrage :
```bash
# Redémarrer tous les services
sudo systemctl restart bbb-startup

# Vérifier les logs
sudo journalctl -xe
```

## 📚 Resources Utiles

- [Documentation BBB](https://docs.bigbluebutton.org/)
- [Guide Greenlight](https://docs.bigbluebutton.org/greenlight/v3/install/#installing-on-a-standalone-server)
- [Documentation SSL](https://docs.bigbluebutton.org/administration/customize)

## ⚠️ Notes Importantes

- Adaptez les adresses IP selon votre réseau
- Conservez les mots de passe dans un endroit sécurisé
- Faites des sauvegardes régulières des volumes Docker

## 🔄 Mises à Jour

Pour mettre à jour BBB :
```bash
sudo apt-get update
sudo apt-get dist-upgrade
sudo bbb-conf --check
```

Pour mettre à jour Greenlight :
```bash
docker pull bigbluebutton/greenlight:v3
sudo systemctl restart bbb-startup
```

