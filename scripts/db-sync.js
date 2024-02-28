import fs from 'fs-extra';
import path from 'path';
import { list, put } from '@vercel/blob';
import axios from 'axios';

const localFolderPath = process.env.PUBLIC_KENER_FOLDER; // Chemin du dossier local
const bucketUrl = "backup"; // Nom du bucket

// Fonction pour télécharger les fichiers manquants depuis @vercel/blob
async function downloadMissingFilesFromBlob() {
    console.log("downloadMissingFilesFromBlob")
    try {
        const { blobs } = await list();
        console.log("blobs",blobs)

        const localFiles = await fs.readdir(localFolderPath);

        for (const blob of blobs) {
            const fileName = path.basename(blob.pathname);
            if (!localFiles.includes(fileName)) {
                const downloadUrl = blob.downloadUrl;
                
                const response = await axios({
                    url: downloadUrl,
                    method: 'GET',
                    responseType: 'stream'
                });

                const writer = fs.createWriteStream(path.join(localFolderPath, fileName));

                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                console.log(`Téléchargé ${fileName} depuis @vercel/blob`);
            }
        }
    }
    catch (error) {
        console.error('Erreur lors du téléchargement des fichiers manquants depuis @vercel/blob :', error);
    }
}

// Fonction pour téléverser les fichiers locaux vers @vercel/blob
async function uploadLocalFilesToBlob(monitor) {
    try {
        const localPaths = [monitor.path0Day,monitor.path90Day]

        for (const filePath of localPaths) {
            const fileContent = await fs.readFile(filePath);
            const fileName = path.basename(filePath);

            await put(`${bucketUrl}/${fileName}`, fileContent, {
                access: 'public',
                addRandomSuffix: false,
            });
            console.log(`Téléversé ${fileName} vers @vercel/blob`);
        }
    }
    catch (error) {
        console.error('Erreur lors du téléversement des fichiers locaux vers @vercel/blob :', error);
    }
}

export { uploadLocalFilesToBlob, downloadMissingFilesFromBlob }
