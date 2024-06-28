import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { Firestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { onCall } from "firebase-functions/v2/https";
// Initialize Firebase
initializeApp();

// Initialize Firestore
const firestore = new Firestore();

// Initialize Storage
const storage = new Storage();

const videoCollectionId = "videos";

export interface Video {
  id?: string,
  uid?: string,
  filename?: string,
  status?: "processing" | "processed",
  title?: string,
  description?: string
}

//Define the function that will be called automatically when user is created
export const createUser = functions.auth.user().onCreate((user) => {
  const userInfo = {
    uid: user.uid,
    email: user.email,
    photoURL: user.photoURL,
  }
  // Add a new document in collection "users" with ID as the user's uid
  firestore.collection("users").doc(user.uid).set(userInfo)
  logger.info(`User Created: ${JSON.stringify(user.uid)}`)
  return;
})


// Define the function that will generate signed URL for uploading video
const rawVideoBucketName = "phong-raw-videos-bucket"
export const generateUploadURL = onCall({maxInstances: 1}, async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new functions.https.HttpsError("failed-precondition", "User is not authenticated")
  }

  const auth = request.auth
  const data = request.data
  const bucket = storage.bucket(rawVideoBucketName)

  // Generate a unique filename for upload
  const fileName = `${auth.uid}-${Date.now()}.${data.fileExtension}`

  // Get a v4 signed URL for uploading file
  const [url] = await bucket.file(fileName).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });

  return {url, fileName};

})

export const getVideos = onCall({maxInstances: 1}, async () => {
  const snapshot = await firestore.collection(videoCollectionId).limit(10).get()
  return snapshot.docs.map((doc) => doc.data())
})