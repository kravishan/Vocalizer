// Get the element with the class "font-22"
const font22Element = document.querySelector('.font-22');

// Add an event listener for the scroll event
window.addEventListener('scroll', function() {
    // Check if font22Element is not null before accessing its style property
    if (font22Element) {
        // Check the scroll position (adjust the value as needed)
        if (window.scrollY > 90) {
            // If scroll position is greater than 50, add a class to hide the element
            font22Element.style.display = 'none';
        } else {
            // Otherwise, remove the class to show the element
            font22Element.style.display = 'block';
        }
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
            window.location.href = './index.html';
        }

        // Add an event listener to the back button
        document.querySelector('.back-button').addEventListener('click', goToInitialStage);

        // Get parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const userLocationString = urlParams.get('userLocation');
        const userLocation = JSON.parse(decodeURIComponent(userLocationString));
        const whisperText = urlParams.get('whisperText');
        const overallStarCount = urlParams.get('overallStarCount');
        const foodRating = urlParams.get('foodRating');
        const serviceRating = urlParams.get('serviceRating');
        const atmosphereRating = urlParams.get('atmosphereRating');
        // const improvedReview = localStorage.getItem('improvedReview');
        const improvedReviewWithStars = urlParams.get('improvedReviewWithStars');
        const selectedRestaurantData = localStorage.getItem("selectedRestaurant");

        // Get or set the generated date and time
        let generatedDateTime = localStorage.getItem('generatedDateTime');

        if (!generatedDateTime) {
            generatedDateTime = new Date().toLocaleString();
            localStorage.setItem('generatedDateTime', generatedDateTime);
        }

        
        // Function to generate star icons based on the rating
        // function getStarRating(rating) {
        //     const stars = '\u2605'; // Unicode character for a solid star
        //     return stars.repeat(parseInt(rating));
        // }

        originalReview = decodeURIComponent(improvedReviewWithStars);

        // Array to store all versions of improvedReviewWithStars
        let improvedReviewVersions = [originalReview];
        // Initialize editCounter
        let editCounter = 0;

        // Event listener for the edit button
        document.getElementById('edit-button-review').addEventListener('click', toggleEditMode);

        // Function to toggle between view mode and edit mode
        function toggleEditMode() {
            const paragraph = document.getElementById('improvedReviewWithStarsText');
            const editButton = document.getElementById('edit-button-review');

            if (paragraph && editButton) {
                if (paragraph.tagName === 'TEXTAREA') {
                    // If already in edit mode, revert to the original paragraph
                    paragraph.outerHTML = `<p id="improvedReviewWithStarsText" class="edite-boxp boxp">${paragraph.value}</p>`;
                    editButton.innerHTML = '<i class="fa fa-edit"></i>';
                    editCounter++;
                    console.log(editCounter);
                } else {
                    // If not in edit mode, convert to a textarea
                    const textContent = paragraph.textContent.trim();
                    paragraph.outerHTML = `<textarea id="improvedReviewWithStarsText" class="edite-boxp" rows="15">${textContent}</textarea>`;
                    editButton.innerHTML = '<i class="fa fa-save"></i>';
                }

                // Only add the edited text to the array if it's different from the original text
                if (editCounter > 0 && paragraph.value && paragraph.value.trim() !== originalReview) {
                    improvedReviewVersions.push(paragraph.value.trim() || originalReview);
                }
            } else {
                console.error('Error: Unable to find necessary elements.');
            }
        }


        document.getElementById('saveButton').addEventListener('click', saveToFirestore);


        

        // Function to save data to Firestore
        function saveToFirestore() {
            console.log('Inside saveToFirestore function');
            // Get the result data
            const resultData = {
                whisperText: whisperText,
                overallStarCount: overallStarCount,
                foodRating: foodRating,
                serviceRating: serviceRating,
                atmosphereRating: atmosphereRating,
                // improvedReview: improvedReview,
                improvedReviewWithStars: improvedReviewVersions,
                generatedDateTime: generatedDateTime,
                sliderValue: document.getElementById("myRange").value,
                userLocation: userLocation,
                selectedRestaurant: JSON.parse(selectedRestaurantData),
                selectedValue: localStorage.getItem('selectedExpectation')
              
            };

            // Retrieve the stepperValue from localStorage
            const stepperValue = parseInt(localStorage.getItem('stepperValue'));

            if (stepperValue > 0) {
                // Use stepperValue as the document name
                const docName = stepperValue.toString();
        
                // Extract the restaurant name and coordinates from selectedRestaurant
                const selectedRestaurant = JSON.parse(localStorage.getItem("selectedRestaurant"));

                // Accessing the "name" field using bracket notation
                const restaurantName = selectedRestaurant['name'];


                console.log('docName:', restaurantName);
        
                // Save data with combined docName, restaurantName, and coordinates as the ID
                db.collection('Results LLM')
                    .doc(`${docName}_${restaurantName}`)
                    .set(resultData)
                    .then(() => {
                        console.log('Document written with ID:', docName);
                        document.cookie = `stepperValue=${stepperValue}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
                        showSuccessMessage();
                        
                    })
                    .catch((error) => {
                        console.error('Error adding document:', error);
                        showFailedMessage();
                    });
            } else {
                // Save data with a generated ID
                db.collection('Results LLM')
                    .add(resultData)
                    .then((docRef) => {
                        console.log('Document written with ID:', docRef.id);
                        document.cookie = `stepperValue=${stepperValue}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
                        showSuccessMessage();
                        
                        
                    })
                    .catch((error) => {
                        console.error('Error adding document:', error);
                        showFailedMessage();
                    });
            }
        }


        // Function to show success message
        function showSuccessMessage() {
            const successMsg = document.getElementById('success-msg');
            successMsg.style.display = 'block';
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 3000);

            goToInitialStageWithDelay();

        }

        // Function to navigate back to the previous page and reset data
        function goToInitialStageWithDelay() {
            // Clear local storage
            localStorage.clear();

            // Redirect to the initial stage after 3000 milliseconds (3 seconds)
            setTimeout(() => {
                window.location.href = './index.html';
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
        document.getElementById('improvedReviewWithStarsText').innerHTML = `${decodeURIComponent(improvedReviewWithStars)}`;
        document.getElementById('dateandtimeOutput').innerHTML = `<strong>Generated Date and Time:</strong> ${generatedDateTime}`;

        
    })
    .catch(error => {
        console.error('Error fetching Firebase configuration:', error);
        // Handle error as needed
    });



    // Function to update the value label when the slider is moved
    function updateSliderValue() {
        var slider = document.getElementById("myRange");
        var output = document.getElementById("sliderValue");
        
        // Update the output only if the slider has been moved
        if (slider.value !== "0") {
            output.innerHTML = slider.value;
        }

        // Store the slider value in localStorage
        localStorage.setItem("sliderValue", slider.value);
    }

    // Function to retrieve the stepper value from localStorage
    function updateStepperValue(inputElement) {
        let value = parseInt(inputElement.value);

        // Ensure the value stays within the min and max limits
        value = Math.min(99, Math.max(0, value));

        // Update the input value
        inputElement.value = value;

        // Store the updated value in localStorage
        localStorage.setItem('stepperValue', value.toString());
    }

    // Get all radio buttons
    const radioButtons = document.querySelectorAll('input[name="expectations"]');

    // Add click event listener to each radio button
    radioButtons.forEach(function (radioButton) {
        radioButton.addEventListener('click', function () {
        // Get the selected value
        const selectedValue = this.value;

        // Save the selected value to Local Storage
        localStorage.setItem('selectedExpectation', selectedValue);
        });
    });

    // Function to read a specific cookie value by name
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Check if the cookie starts with the specified name
            if (cookie.startsWith(name + '=')) {
                return cookie.substring(name.length + 1);
            }
        }
        return null;
    }

    // Function to set stepper value from cookies to UI and call updateStepperValue
    function setStepperValueFromCookies() {
        const stepperValueCookie = getCookie('stepperValue');
        if (stepperValueCookie !== null) {
            const stepperInputElement = document.querySelector('.ios-stepper input[type="number"]');
            if (stepperInputElement) {
                stepperInputElement.value = stepperValueCookie;
                // Call updateStepperValue function with the retrieved value
                updateStepperValue(stepperInputElement);
            }
        }
    }

    // Call this function when the page is loaded
    window.addEventListener('load', setStepperValueFromCookies);




    
    





 


      