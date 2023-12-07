const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');
const admin = require('firebase-admin');

require('dotenv').config();

const fs = require('fs');
const wav = require('wav');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Track user login attempts
const loginAttempts = {};

// Define your Google Maps API key
const googleMapsApiKey = process.env.GOOGLEMAP_APIKEY;
const openaiApiKey = process.env.OPENAI_APIKEY;

// Middleware to handle CORS (Cross-Origin Resource Sharing) - adjust as needed
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Endpoint to serve the Google Maps API script
app.get('/google-maps-script', (req, res) => {
  const script = `
    const googleMapsScript = document.createElement('script');
    googleMapsScript.src = 'https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places';
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    document.head.appendChild(googleMapsScript);
  `;
  res.send(script);
});

// Multer middleware for handling file uploads
const upload = multer();

// Endpoint to transcribe audio
app.post('/transcribe-audio', upload.single('file'), async (req, res) => {
  try {
    const audioBlob = req.file.buffer.toString('base64');

    // Log the raw audioBlob data
    console.log('Raw Audio Blob:', audioBlob);

    if (!audioBlob || typeof audioBlob !== 'string') {
      console.error('Invalid audio data:', audioBlob);
      res.status(400).send({ error: 'Invalid audio data' });
      return;
    }

    // Convert the received audio data to a Buffer
    const wavData = Buffer.from(audioBlob, 'base64');

    // Log the converted audio data
    console.log('Converted Audio Data:', wavData);

    // Construct the multipart/form-data manually
    const formData = new FormData();

    // Append additional parameters
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'text');
    formData.append('file', wavData, { filename: 'audio_received.wav' });

    // Forward the audio to the Whisper API
    const whisperApiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    console.log('Whisper API Response:', whisperApiResponse.status, whisperApiResponse.statusText);

    if (!whisperApiResponse.ok) {
      throw new Error(`Whisper API request failed: ${whisperApiResponse.statusText}`);
    }

    const whisperApiData = await whisperApiResponse.text();
    const transcription = whisperApiData;

    console.log('Whisper API Data:', transcription);

    // Send the result back to the frontend
    res.send({ transcription });
  } catch (error) {
    console.error('Error during Whisper API request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Endpoint for handling the OpenAI request
app.post('/generate-improved-review', async (req, res) => {
  try {
      const whisperText = req.body.whisperText;
      const restaurantName = req.body.restaurantName;

      // Prompts tailored for hotel and restaurant reviews
      const additionalPrompts = [
        "I recently visited a restaurant and want to share my experience.",
        "Please enhance my brief feedback by adding more details and making it consumer-friendly.",
        "Imagine you are the customer, what additional information would you find helpful in a review?",
        "Take my short review and make it more informative for other consumers.",
        "Provide insights that would be valuable for someone considering a visit to the restaurant.",
        "Add details that could influence a consumer's decision to choose or avoid the restaurant.",
        "Don't make it too lengthy. you know what the average review looks like.",
       
    ];

      // Combine additional prompts with the user's input
      const inputMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...additionalPrompts.map(prompt => ({ role: 'assistant', content: prompt })),
        { role: 'user', content: whisperText },
        { role: 'user', content: `Restaurant Name: ${restaurantName}` },
    ];


      // Fetch response from OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: inputMessages,
          }),
      });

      if (!response.ok) {
          throw new Error(`OpenAI API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const improvedReview = data.choices[0].message.content;

      // Send the improved review back to the frontend
      res.send({ improvedReview });

  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});



// Endpoint for handling the OpenAI request with stars
app.post('/generate-improved-review-with-stars', async (req, res) => {
  try {
      const globalWhisperText = req.body.globalWhisperText;
      const selectedOverallStarCount = req.body.selectedOverallStarCount;
      const foodRating = req.body.foodRating;
      const serviceRating = req.body.serviceRating;
      const atmosphereRating = req.body.atmosphereRating;
      const restaurantName = req.body.restaurantName;

      // Prompts tailored for hotel and restaurant reviews
      const additionalPrompts = [
        "I recently visited a restaurant and want to share my experience.",
        "Please enhance my brief feedback by adding more details and making it consumer-friendly.",
        "Imagine you are the customer, what additional information would you find helpful in a review?",
        "Take my short review and make it more informative for other consumers.",
        "Provide insights that would be valuable for someone considering a visit to the restaurant.",
        "Add details that could influence a consumer's decision to choose or avoid the restaurant.",
        "Don't make it too lengthy. you know what the average review looks like.",
        "Don't mmentioend any star rating values inside the review. just use them to get an idea about user experience.",
        "I also can share my star ratings for overall experience, food quality, service and atmosphere. dont mentione them in the review. just use them to make it more informative.",
    ];


      // Combine additional prompts with the user's input and star ratings
      const inputMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...additionalPrompts.map(prompt => ({ role: 'assistant', content: prompt })),
        { role: 'user', content: globalWhisperText },
        { role: 'user', content: `This is the restaurant name: ${restaurantName}` },
        { role: 'user', content: `This is the overall star rating user have given about their expirience: ${selectedOverallStarCount}` },
        { role: 'user', content: `This is rating that user gives about food quality: ${foodRating}` },
        { role: 'user', content: `This is rating that user gives about service that they had: ${serviceRating}` },
        { role: 'user', content: `This is rating that user gives about Atmosphere that resturent had: ${atmosphereRating}` },
    ];

      // Fetch response from OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: inputMessages,
          }),
      });

      if (!response.ok) {
          throw new Error(`OpenAI API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const improvedReviewWithStars = data.choices[0].message.content;

      // Send the improved review with stars back to the frontend
      res.json({ improvedReviewWithStars });

  } catch (error) {
      console.error('Error:', error);
      res.status(500).send({ error: 'Internal server error' });
  }
});





// Your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9GNhQGsnfy85gM9u_dJuOKWAZqPUdk44",
  authDomain: "vocalize-dc445.firebaseapp.com",
  projectId: "vocalize-dc445",
  storageBucket: "vocalize-dc445.appspot.com",
  messagingSenderId: "50867328520",
  appId: "1:50867328520:web:81681fc6f1baaae8b823bd"
};

// Endpoint to get Firebase configuration
app.get('/firebase-config', (req, res) => {
  res.json({ firebaseConfig });
});








// Endpoint to check login credentials
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // For demonstration purposes, use a fixed password
  const fixedPassword = process.env.FIXED_PASSWORD;

  // Check if the username and password are correct
  if (password === fixedPassword) {
    // Successful login
    res.send({ success: true, message: 'Login successful' });

    // Reset login attempts for the user
    delete loginAttempts[username];
  } else {
    // Incorrect password

    // Track login attempts
    loginAttempts[username] = (loginAttempts[username] || 0) + 1;

    // Check if the user is locked
    if (loginAttempts[username] >= 3) {
      // Lock the account
      res.status(403).send({ success: false, message: 'Account locked. Too many incorrect attempts.' });
    } else {
      // Provide feedback for incorrect password
      res.status(401).send({ success: false, message: 'Incorrect password. Please try again.' });
    }
  }
});


// New endpoint for analyzing the review and generating grades for each field
app.post('/analyze-review', async (req, res) => {
  try {
    const { whisperText, improvedReview, improvedReviewWithStars } = req.body;

    // Prompts tailored for review analysis
    const additionalPrompts = [
      "I want to analyze a user's review and provide a grade.",
      "Enhance the review analysis by considering various aspects.",
      "Imagine you are assessing the review for quality and helpfulness.",
      "What key elements contribute to a well-structured and informative review?",
      "Consider factors such as clarity, details, and overall impact on the reader.",
      "Avoid mentioning specific grading criteria in the analysis.",
    ];

    // Function to perform grading logic for a given content
    const performGradingLogic = async (content) => {
      // Fetch response from OpenAI API for review analysis
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an expert review analyst.' },
            ...additionalPrompts.map(prompt => ({ role: 'assistant', content: prompt })),
            { role: 'user', content },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const analysisResult = data.choices[0].message.content;

      // Replace this with your actual grading logic
      return Math.random() * 10; // Example: Return a random score between 0 and 10
    };

    // Perform grading for each field
    const whisperTextGrade = await performGradingLogic(whisperText);
    const improvedReviewGrade = await performGradingLogic(improvedReview);
    const improvedReviewWithStarsGrade = await performGradingLogic(improvedReviewWithStars);

    // Respond with individual grades
    res.send({
      whisperTextGrade,
      improvedReviewGrade,
      improvedReviewWithStarsGrade,
    });

  } catch (error) {
    console.error('Error during review analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
