import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

// Create a new storage instance
const storage = new Storage();

// Define the bucket name
const rawVideoBucketName = "phong-raw-videos-bucket"
const processedVideoBucketName = "phong-processed-videos-bucket"

const localRawVideoPath = "./raw-videos"
const localProcessedVideoPath = "./processed-videos"


/**
 * Ensure a directory exists, if not create it
 * @param {string} directoryPath - The path of the directory to check
 */
const ensureDirectoryExists = (directoryPath: string) => {
  if (!fs.existsSync(directoryPath)) {
    // Create the directory if it does not exist. Set recursive to true to enable creating nested directories
    fs.mkdirSync(directoryPath, {recursive: true})
    console.log(`Directory created at path: ${directoryPath}`)
  }
}

/**
 * Set up the directories for storing raw and processed videos
 * 
 */
export const setUpDirectories = () => {
  ensureDirectoryExists(localRawVideoPath)
  ensureDirectoryExists(localProcessedVideoPath)
}

/**
 * Process raw video and save the processed video
 * @param {string} rawVideoName - The name of the raw video
 * @param {string} processedVideoName - The name of the processed video. By default, the "processed_" prefix is added to the raw video name
 * @return {Promise<void>}
 */
export const convertVideo = (rawVideoName: string, processedVideoName: string = `processed_${rawVideoName}`) : Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
    .outputOption('-vf', 'scale=-1:360')
    .on('end', () => {
      console.log('Processing finished successfully!')
      resolve()
    })
    .on('error', (err) => {
      console.log('Error: ', err)
      reject(err)
    })
    .save(`${localProcessedVideoPath}/${processedVideoName}`)
  })
}


/**
 * Download raw video from Google Cloud Storage bucket 
 * @param filename - The name of the raw video file to download
 */
export const downloadRawVideo = async (filename: string) => {
  await storage.bucket(rawVideoBucketName)
                .file(filename)
                .download({destination: `${localRawVideoPath}/${filename}`})
  console.log(`gs://${rawVideoBucketName}/${filename} downloaded to ${localRawVideoPath}/${filename}.`)
}


/**
 * Upload processed video to Google Cloud Storage bucket 
 * @param filename - The name of the processed video file to upload
 */
export const uploadProcessedVideo = async (filename: string) => {
  const bucket = storage.bucket(processedVideoBucketName)
  await storage.bucket(processedVideoBucketName)
                .upload(`${localProcessedVideoPath}/${filename}`, {
                  // specifies the name of the file once it is uploaded to the bucket. In this case, it is the same as the filename.
                  destination: filename
                })
  console.log(`${filename} uploaded to gs://${processedVideoBucketName}/${filename}.`)

  // set the video to be publicly viewable.This is an asynchronous operation that changes the file's access permissions to allow public acces
  await bucket.file(filename).makePublic()
}

/**
 * Delete file 
 * @filePath - The path of the file to delete
 * @return {Promise<void>}
 */
const deleteFile = (filePath: string) : Promise<void> => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, err => {
        if (err) {
          console.log('Deleting file failed: ', err)
          reject(err)
        }
        else {
          console.log(`File at path ${filePath} deleted successfully`)
          resolve()
        }
      })
    } else {
      console.log(`File at path ${filePath} does not exist`)
      resolve()
    }
  })
}


/**
 * Delete raw video from local storage
 * @param filename - The name of the raw video file to delete
 * @return {Promise<void>}
 */
export const deleteRawVideo = (filename: string): Promise<void> => {
  return deleteFile(`${localRawVideoPath}/${filename}`)
}

/**
 * Delete processed video from local storage
 * @param filename - The name of the processed video file to delete
 * @return {Promise<void>}
 */
export const deleteProcessedVideo = (filename: string): Promise<void> => {
  return deleteFile(`${localProcessedVideoPath}/${filename}`)
}

