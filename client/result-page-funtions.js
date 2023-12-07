
        // Get the element with the class "font-22"
        const font22Element = document.querySelector('.font-22');

        // Add an event listener for the scroll event
        window.addEventListener('scroll', function() {
            // Check the scroll position (adjust the value as needed)
            if (window.scrollY > 90) {
                // If scroll position is greater than 50, add a class to hide the element
                font22Element.style.display = 'none';
            } else {
                // Otherwise, remove the class to show the element
                font22Element.style.display = 'block';
            }
        });


        // Fetch Firebase configuration from the server
        fetch('https://vocalizer.dev/server/firebase-config')
        .then(response => response.json())
        .then(firebaseConfig => {
            // Initialize Firebase with the received configuration
            firebase.initializeApp(firebaseConfig);

            // Get a reference to the Firestore database
            const db = firebase.firestore();
            
            // Function to navigate back to the previous page
        function goToInitialStage() {
            window.location.href = '/index.html'; 
       }


       // Add an event listener to the back button
       document.querySelector('.back-button').addEventListener('click', goToInitialStage);
       
       // Get parameters from URL
       const urlParams = new URLSearchParams(window.location.search);
       const whisperText = urlParams.get('whisperText');
       const overallStarCount = urlParams.get('overallStarCount');
       const foodRating = urlParams.get('foodRating');
       const serviceRating = urlParams.get('serviceRating');
       const atmosphereRating = urlParams.get('atmosphereRating');
       const improvedReview = localStorage.getItem('improvedReview');
       const improvedReviewWithStars = urlParams.get('improvedReviewWithStars');

       // Get or set the generated date and time
       let generatedDateTime = localStorage.getItem('generatedDateTime');

       if (!generatedDateTime) {
           generatedDateTime = new Date().toLocaleString();
           localStorage.setItem('generatedDateTime', generatedDateTime);
       }

       // Function to generate star icons based on the rating
       function getStarRating(rating) {
           const stars = '\u2605'; // Unicode character for a solid star
           return stars.repeat(parseInt(rating));
       }

       // Function to save data to Firestore
       function saveToFirestore() {
           // Get the result data
           const resultData = {
               whisperText: whisperText,
               overallStarCount: overallStarCount,
               foodRating: foodRating,
               serviceRating: serviceRating,
               atmosphereRating: atmosphereRating,
               improvedReview: improvedReview,
               improvedReviewWithStars: improvedReviewWithStars,
               generatedDateTime: generatedDateTime,
           };

           // Add a new document with a generated ID to the 'results' collection
           db.collection('results')
               .add(resultData)
               .then((docRef) => {
                   console.log('Document written with ID:', docRef.id);
                   showSuccessMessage();
               })
               .catch((error) => {
                   console.error('Error adding document:', error);
                   showFailedMessage();
               });
       }

       // Function to show success message
       function showSuccessMessage() {
           const successMsg = document.getElementById('success-msg');
           successMsg.style.display = 'block';
           setTimeout(() => {
               successMsg.style.display = 'none';
           }, 3000); 
       }

       // Function to show failure message
       function showFailedMessage() {
           const failedMsg = document.getElementById('failed-msg');
           failedMsg.style.display = 'block';
           setTimeout(() => {
               failedMsg.style.display = 'none';
           }, 3000); 
       }


       // Display the data on the page
       document.getElementById('voiceReviewText').innerHTML = `${whisperText}`;
       document.getElementById('improvedReviewText').innerHTML = `${improvedReview}`;
       document.getElementById('improvedReviewWithStarsText').innerHTML = `${decodeURIComponent(improvedReviewWithStars)}`;
       document.getElementById('dateandtimeOutput').innerHTML = `<strong>Generated Date and Time:</strong> ${generatedDateTime}`;

        })
        .catch(error => {
            console.error('Error fetching Firebase configuration:', error);
            // Handle error as needed
        });
        

        