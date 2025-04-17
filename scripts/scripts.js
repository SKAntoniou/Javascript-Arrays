// Light / Dark Mode Toggle =============================================================================
const lightDarkToggle = document.getElementById('light-dark-toggle');
lightDarkToggle.addEventListener("change", () => {
  for (let currentValue of lightDarkToggle.children) {
    if (currentValue.checked) {
      if (currentValue.id === 'toggle-light') {
        document.documentElement.setAttribute("data-theme", "light");
        break;
      } else if (currentValue.id === 'toggle-dark') {
        document.documentElement.setAttribute("data-theme", "dark");
        break;
      } else {
        document.documentElement.removeAttribute("data-theme");
        break;
      }
    }
  }
});

// Email validation ==============================================================================
// Regex 
const emailRegex = /^\S+@\S+\.\S+$/;

// Document Selectors
const emailInput = document.getElementById("input-email");
const emailSubmit = document.getElementById("submit-email");
const emailContainerMissing = document.getElementById("missing-email");
const emailContainerVerified = document.querySelector("#verified-email");
const emailSwitchAccount = emailContainerVerified.querySelector("#switch-account");

// Variables for processing
const emailInvalidMessage = "Please enter a valid email address.";
let emailValid = false;

// Processing
// Email Validation
['focusout', 'change'].forEach( event => {
  emailInput.addEventListener(event, () => {
    if (!emailRegex.test(emailInput.value.toLowerCase())) {
      emailInput.setCustomValidity(emailInvalidMessage);
      emailValid = false;
    } else {
      emailInput.setCustomValidity("");
      emailValid = true;
    }
    emailInput.reportValidity();
  })
});

// Random image fetch ==============================================================================

// Variables for processing =================
// Parent containers
const imagePreviewContainer = document.querySelector(".image-preview");
const userArea = document.querySelector(".user-area");

// Child elements
const genImageContainer = imagePreviewContainer.querySelector(".generated-image");
const newImageButton = imagePreviewContainer.querySelector(".btn-refresh");
const saveImageButton = imagePreviewContainer.querySelector(".btn-save");
const userSavedImages = userArea.querySelector(".user-saved-images");

// URLs for random image sites
const picsumURL = "https://picsum.photos/600/400";


// Variables for DB Tracking
let currentEmail = "";
let imageStored = false;
let shownImages = [];
// DB name to just make things easier to edit if needed.
const imagesDatabaseName = "userImages";
// Variable to store current image in
let currentBlob;
let currentImageId = getImageIds(); // This is a promise

// Run the function once to display one image when page loads.
fetchBlob(picsumURL);

// Buttons =============================================

// Email Buttons ============
// Submit Email
function submitFunction() {
  if (emailValid) {
    currentEmail = emailInput.value.toLowerCase();
    emailContainerMissing.style.display = "none";
    emailContainerVerified.style.display = "flex";
    emailContainerVerified.querySelector("#current-email").innerHTML = currentEmail;
    renderSavedImages(currentEmail);
  } else {
    emailInput.setCustomValidity(emailInvalidMessage);
    emailInput.reportValidity();
  }
}
// Submit via submit button
emailSubmit.addEventListener('click', () => {
  submitFunction();
});
// Also submit on enter press in the input field.
emailInput.addEventListener("keypress", (e) => {
  if (e.key === 'Enter' && emailValid) {
    submitFunction();
  }
})

// Switch email
emailSwitchAccount.addEventListener('click', () => {
  emailContainerMissing.style.display = "flex";
  emailContainerVerified.style.display = "none";
  emailContainerVerified.querySelector("#current-email").innerHTML = "";
  currentEmail = "";
  userSavedImages.innerHTML = "";
  shownImages = [];
});

// Image Buttons ============

// Save image on email using currentEmail
saveImageButton.addEventListener('click', async () => {
  if (currentEmail !== "") {
    storeData(currentEmail, currentBlob, currentImageId)
      .then(() => {
        imageStored = true;
        renderSavedImages(currentEmail);
      })
      .catch((error) => {
        console.error("Error in Storing the image: ", error);
      });
  }
});
// Get New Image
newImageButton.addEventListener('click', async () => {
  saveImageButton.disabled = true;
  await fetchBlob(picsumURL);
  currentImageId = await getImageIds();
  imageStored = false;
  saveImageButton.disabled = false;
});



// Helper Functions ================================

// Get image and make it in blob format (binary, to be able to go in database)
function fetchBlob(url) {
  return fetch(url)
          .then(response => response.blob())
          .then( blob => {
            currentBlob = blob;
            let url = window.URL || window.webkitURL;
            genImageContainer.src = url.createObjectURL(blob);
            genImageContainer.crossOrigin = "anonymous";
          });
};
// Create HTML to insert image
function createImgContainer(imageBlob) {
  const htmlElement = document.createElement("img");
  htmlElement.classList.add("img");
  htmlElement.alt = "Random Image";
  let url = window.URL || window.webkitURL;
  htmlElement.src = url.createObjectURL(imageBlob);
  htmlElement.crossOrigin = "anonymous";
  return htmlElement;
}
// Render Images
async function renderSavedImages(email) {
  const storedImages = await getImages(email);
  for (let i = 0, j = storedImages.length; i < j; i++) {
    if (!shownImages.includes(storedImages[i].id)) {
      const htmlImg = createImgContainer(storedImages[i].image);
      shownImages.push(storedImages[i].id);
      userSavedImages.appendChild( htmlImg );
    }
  }
}

// Database Functions ===============================

// Database Helper functions =======
// Helper to not duplicate making the database
function makeDatabaseStructure(event) {
  // The database instance
  const db = event.target.result;
  // Check for images table, if it doesn't exist, make it with id as primary key
  if (!db.objectStoreNames.contains("images")) {
    db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
  }
  // Check for emails' data table
  if (!db.objectStoreNames.contains("emails")) {
    const emailStore = db.createObjectStore("emails", { keyPath: "id", autoIncrement: true });
    // Create index to stop duplicates using Unique Composite Indexes
    emailStore.createIndex("uniqueEmailAndImage", ["email", "imageId"], { unique: true });
  }
}

// Database Main Functions =========
// Store Data
async function storeData(email, blob, imageId) {
  return new Promise( (resolve, reject) => {
    // Open database
    // returns IDBOpenDBRequest object
    const request = indexedDB.open(imagesDatabaseName);

    // Handle error opening database
    request.onerror = (event) => {
      console.error(`Database error: ${event.target.error?.message}`);
      reject();
    }

    // Event when database is created or version number has changed
    request.onupgradeneeded = (event) => {
      makeDatabaseStructure(event);
    };

    request.onsuccess = async (event) => {
      // The database instance
      const db = event.target.result;

      if (!imageStored) {
        // Starts a transaction on images with write privileges
        const transactionImages = db.transaction("images", "readwrite");

        // Gets location of images table (in this DB, it is object oriented so it actually called a store.)
        const imagesTable = transactionImages.objectStore("images");

        // Add blob to table
        imagesTable.add({ image: blob });
      }

      // Starts a transaction on images with write privileges
      const transactionEmails = db.transaction("emails", "readwrite");

      // Gets location of images table
      const emailsTable = transactionEmails.objectStore("emails");
      
      // Attempt to add email and imageId to table
      const addAttempt = emailsTable.add({ email: email, imageId: await imageId });

      // Catch duplicates
      addAttempt.onerror = (event) => {
        // I don't need to reject here as it is not an error. This is by design.
        // This is a duplicate so resolve still.
        resolve();

        // Add something to show user it is a duplicate image

        // This is a placeholder
        console.log("Attempt to add image to DB failed due to: Duplicate Image")
      }

      // Successful attempt 
      addAttempt.onsuccess = (event) => {
        resolve();
        // Maybe add something to say it was added

        // This is a placeholder
        console.log("Email and Image combo has been added to database")
      }
    }
  });
}
// Get images based on email address
async function getImages(email) {
  // Part one of two - This will get the imageIds from the emails Database
  // New Promise is for the cursor
  const imageIds = new Promise( (resolve, reject) => {
    const request = indexedDB.open(imagesDatabaseName);

    request.onerror = (event) => {
      reject(`Database error: ${event.target.error?.message}`);
    };

    request.onupgradeneeded = (event) => {
      makeDatabaseStructure(event);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      const transaction = db.transaction("emails", "readonly");
      const emailsTable = transaction.objectStore("emails");
      const getRequest = emailsTable.openCursor();

      let cursorValue = [];

      // On error
      getRequest.onerror = (event) => {
        reject(`Database error: ${event.target.error?.message}`);
      };

      // On return success
      getRequest.onsuccess = (event) => {
        // Use Cursor
        const cursor = event.target.result;

        // This will auto loop.
        if (cursor) {
          if (cursor.value.email === email) {
            cursorValue.push(cursor.value.imageId);
          }
          cursor.continue(); // Move to the next matching record
        } else {
          resolve(cursorValue);
        }
      };
    };
  });

  // Part two of two - This will get the images based on ImageIds
  return imageIds.then( async (imageIds) => {
    return new Promise( (resolve, reject) => {
      const request = indexedDB.open(imagesDatabaseName);
      request.onerror = (event) => {
        reject(`Database error: ${event.target.error?.message}`);
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        // Read only this time
        const transaction = db.transaction("images", "readonly");
        const imagesTable = transaction.objectStore("images");
        const getRequest = imagesTable.openCursor();

        let cursorValue = [];
        // On error
        getRequest.onerror = (event) => {
          reject(`Database error: ${event.target.error?.message}`);
        };

        // On return success
        getRequest.onsuccess = (event) => {
          // Use Cursor
          const cursor = event.target.result;

          // This will auto loop.
          if (cursor) {
            for (let i = 0, j = imageIds.length; i < j; i++) {
              // imageIds are this email's images saved as Original Email ID
              // Cursor is all the images' ids.
              if (imageIds[i] == cursor.value.id) {
                cursorValue.push(cursor.value);
              }
            }
            cursor.continue(); // Move to the next matching record
          } else {
            resolve(cursorValue);
          }
        };
      }
    });
  });
}

async function getImageIds() {
  return new Promise( ( resolve, reject ) => {
    const request = indexedDB.open(imagesDatabaseName);

    request.onerror = (event) => {
      console.error(`Database error: ${event.target.error?.message}`);
      reject(event.target.error);
    }
  
    request.onupgradeneeded = (event) => {
      makeDatabaseStructure(event);
    }
  
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("images", "readonly");
      const imagesTable = transaction.objectStore("images");
  
      countImages = imagesTable.count();
  
      countImages.onerror = (event) => {
        console.error("Counting Image Database entries failed: ", event.target.error?.message);
        reject(event.target.error);
      }
  
      countImages.onsuccess = (event) => {
        resolve((countImages.result + 1));
      }
    }
  });
}


// Then
// Redo helper functions
// Redo buttons

// Future
// Add seeded images

