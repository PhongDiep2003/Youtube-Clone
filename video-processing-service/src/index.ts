import express from "express";
import { setUpDirectories, convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, uploadProcessedVideo } from "./storage";
import { isVideoNew, setVideo } from "./firestore";

const app = express();
app.use(express.json());

//Set up directories for storing raw and processed videos when first starting the server
setUpDirectories();

app.post('/process-video', async (req, res) => {
  

  //Get the message and filename from the Cloud Pub/Sub message
  let data;
  try {
    if (!req.body) {
      const message = "No Pub/Sub message received!"
      console.error(`error: ${message}`);
      return res.status(400).send(`Bad Request: ${message}`)
    }
    if (!req.body.message) {
      const message = "Invalid Pub/Sub message format!"
      console.error(`error: ${message}`);
      return res.status(400).send(`Bad Request: ${message}`)
    }
    const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error('Invalid message payload received.');
    }
  } catch (error) {
    console.error('No data provided!');
    return res.status(400).send('Bad Request: missing filename.');
  }
  
  // Extract the file name from the Pub/Sub message
  const inputFileName = data.name;
  // Add a prefix to the processed video file name
  const outputFileName = `processed_${inputFileName}`;
  // Generate id for passed file (video)
  const videoId = inputFileName.split('.')[0];
  // Check if the video is new
  if (!isVideoNew(videoId)) {
    return res.status(400).send('Bad Request: Video already processing or processed.')
  } else {
    await setVideo(videoId, {
      status: 'processing',
      uid: videoId.split('-')[0],
      id: videoId
    })
  }


  //Download raw video from Google Cloud Storage bucket to local storage
  await downloadRawVideo(inputFileName)

  //Process raw video
  try {
    await convertVideo(inputFileName, outputFileName)
  } catch (error) {
    // If an error occurs during video processing, delete the raw and processed videos in the local storage and return the error message
    console.error('Error processing video:', error);
    Promise.all([deleteRawVideo(inputFileName), deleteProcessedVideo(outputFileName)])
    return res.status(500).send('Error processing video');
  }

  // Upload processed video to Google Cloud Storage bucket
  await uploadProcessedVideo(outputFileName)

  await setVideo(videoId, {
    status: 'processed',
    filename: outputFileName
  })

  // Delete raw and processed videos from local storage
  await Promise.all([deleteRawVideo(inputFileName), deleteProcessedVideo(outputFileName)])
  return res.status(200).send('Video processed successfully!')
})


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})