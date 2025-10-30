# Kubernetes deployment

These manifests are used to deploy the application on a Kubernetes cluster. 

There are different ways to deploy the application, either deploy it with:
- a SQLite database
- via a CNPG Postgres database (CNPG required).
- or a generic database (that is supported out of the box by Kener)


## Basic deployment on existing cluster

To deploy the application on an existing cluster, you can use the following steps:

1. Go through `kener-secret.yaml` and `smtp-secret.yaml` and change the values to your needs
2. Go through `kener-pvc.yaml` and `kener-db-pvc` and update the storage to your needs
3. Then, run the following commands:

```shell
kubectl create namespace kener # Creating the appropriate namespace
kubectl apply -k manifests -n kerner # Applying the manifests
kubectl get pods -n kener # Checking if the pods are running
```

## Deploying with a database

If you have a database already running on your cluster or you want to use an external database, you can deploy the application with it. To do so, you can use the following steps:

1. In the `deployment.yaml` file, uncomment the `DATABASE_URL` environment variable and comment out the `kener-db` volume mount and the `kener-db` volume.
2. In the `kustomization.yaml` file, comment out the `kener-db-pvc.yaml` as we don't need that one anymore.
4. Then update `kener-secret.yaml` with the appropriate values for the database.
5. lastly, run the following commands:

```shell
kubectl create namespace kener # Creating the appropriate namespace
kubectl apply -k manifests -n kerner # Applying the manifests
kubectl get pods -n kener # Checking if the pods are running
```


## Deploying with CNPG

If you have [CNPG](https://cloudnative-pg.io/) installed, you can deploy the application with a Postgres database. To do so, you can use the following steps:

1. In the `deployment.yaml` file, uncomment the `DATABASE_URL` environment variable and comment out the `kener-db` volume mount and the `kener-db` volume.
2. Then, update `cluster-secret.yaml` with the username and password you want to use for your database.
3. In the `kustomization.yaml` file, uncomment the `cluster.yaml` and `cluster-secret.yaml` entries to include them. Comment out the `kener-db-pvc.yaml` as we don't need that one anymore.
4. Also update `kener-secret.yaml` with the appropriate values for the database.
5. lastly, run the following commands:

```shell
kubectl create namespace kener # Creating the appropriate namespace
kubectl apply -k manifests -n kerner # Applying the manifests
kubectl get pods -n kener # Checking if the pods are running
```

## Ingress / IngressRoute

To connect the application to your domain/sub-domain, you need either an Ingress or IngressRoute defined. These do not come bundled as this depends mostly on your kubernetes setup (e.g. using Traefik or NGINX etc.).

To get you started, a barebones Ingress is provided below:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
#  annotations: -> Tells certmanager to issue a certificate
#    cert-manager.io/cluster-issuer: Issuer-Name
  name: kener-ingress
spec:
  rules:
    - host: kener.yourdomain.com
      http:
        paths:
          - backend:
              service:
                name: kener
                port:
                  number: 3000
            path: /
            pathType: Prefix
#  tls: -> Enables HTTPS
#    - hosts:
#        - kener.yourdomain.com
#      secretName: kener-tls
```
