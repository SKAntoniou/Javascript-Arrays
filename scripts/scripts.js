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
const prevImageButton = imagePreviewContainer.querySelector(".btn-prev");
const nextImageButton = imagePreviewContainer.querySelector(".btn-next");
const saveImageButton = imagePreviewContainer.querySelector(".btn-save");
const statusContainer = imagePreviewContainer.querySelector(".status-container");
const userSavedImages = userArea.querySelector(".user-saved-images");

// Variables for DB Tracking
let currentEmail = "";
let shownImages = [];
// DB name to just make things easier to edit if needed.
const imagesDatabaseName = "userImages";
let dbInstance = null;
// Variable to store current image in
let currentSeed = randomSeed(); 
let currentImageId = getImageIds(); // This is a promise

// States ============================================
// Startup State
genImageContainer.appendChild(createImgContainer(makePicsumURL(currentSeed - 1)));
genImageContainer.childNodes[0].classList.add("hide", "prev");
genImageContainer.appendChild(createImgContainer(makePicsumURL(currentSeed)));
genImageContainer.childNodes[1].classList.add("current");
genImageContainer.appendChild(createImgContainer(makePicsumURL(currentSeed + 1)));
genImageContainer.childNodes[2].classList.add("hide", "next");

// Click off screen state
window.addEventListener("beforeunload", () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
});

// Uncaught errors
window.addEventListener("error", (e) => {
  console.error("Global JS Error:", e.message, e);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled Promise Rejection:", e.reason);
});

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
    storeData(currentEmail, currentSeed, currentImageId)
      .then(() => {
        renderSavedImages(currentEmail);
      })
      .catch((error) => {
        console.error("Error in Storing the image: ", error);
      });
  }
});
// Get New Image
nextImageButton.addEventListener('click', async () => {
  // Disabled save button until completed operations.
  saveImageButton.disabled = true;
  // Set current seed to new picture
  currentSeed++;
  // Remove hidden previous image
  genImageContainer.removeChild(document.querySelector(".prev"));
  // Make current image hidden
  genImageContainer.querySelector(".current").classList.add("hide", "prev");
  genImageContainer.querySelector(".current").classList.remove("current");
  // Make next image not hidden
  genImageContainer.querySelector(".next").classList.add("current");
  genImageContainer.querySelector(".next").classList.remove("hide", "next");
  // Load next image
  genImageContainer.appendChild(createImgContainer(makePicsumURL(currentSeed + 1)));
  genImageContainer.childNodes[2].classList.add("hide", "next");
  // Get new image ID
  currentImageId = await getImageIds();
  // Enable the save button
  saveImageButton.disabled = false;
});
// Go back to last image
prevImageButton.addEventListener('click', async () => {
  // Disabled save button until completed operations.
  saveImageButton.disabled = true;
  // Set current seed to new picture
  currentSeed--;
  // Remove hidden next image
  genImageContainer.removeChild(document.querySelector(".next"));
  // Make current image hidden
  genImageContainer.querySelector(".current").classList.add("hide", "next");
  genImageContainer.querySelector(".current").classList.remove("current");
  // Make prev image not hidden
  genImageContainer.querySelector(".prev").classList.add("current");
  genImageContainer.querySelector(".prev").classList.remove("hide", "prev");
  // Load next image
  genImageContainer.prepend(createImgContainer(makePicsumURL(currentSeed - 1)));
  genImageContainer.childNodes[0].classList.add("hide", "prev");
  // Get new image ID
  currentImageId = await getImageIds();
  // Enable the save button
  saveImageButton.disabled = false;
});

// Helper Functions ================================

// Create HTML to insert image
function createImgContainer(url) {
  const htmlElement = document.createElement("img");
  htmlElement.classList.add("img");
  htmlElement.alt = "Random Image";
  htmlElement.src = url;
  return htmlElement;
}
// Render Images
async function renderSavedImages(email) {
  const storedImages = await getImages(email);
  for (let i = 0, j = storedImages.length; i < j; i++) {
    if (!shownImages.includes(storedImages[i].id)) {
      const htmlImg = createImgContainer(makePicsumURL(storedImages[i].image));
      shownImages.push(storedImages[i].id);
      userSavedImages.appendChild( htmlImg );
    }
  }
}
// Create Seed for images
function randomSeed() {
  // Starting from one million, Ending at one trillion.
  // This will allow for previous image without seed going negative. It still would be possible but extremely unlikely as you would need to press previous a million times.
  return Math.floor(Math.random() * 999999999999) + 1000000;
}
// Generate a seeded picture from Picsum Photos.
function makePicsumURL(seed) {
  const baseURL = "https://picsum.photos/seed/";
  const size = "/600/400";
  return baseURL + seed + size;
}


// Database Functions ===============================

// Database Helper functions =======
// Helper to not duplicate making the database
function makeDatabaseStructure(event) {
  // The database instance
  const db = event.target.result;
  // Check for images table, if it doesn't exist, make it with id as primary key
  if (!db.objectStoreNames.contains("images")) {
    const imageStore = db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
    imageStore.createIndex("uniqueImage", ["image"], { unique: true });
  }
  // Check for emails' data table
  if (!db.objectStoreNames.contains("emails")) {
    const emailStore = db.createObjectStore("emails", { keyPath: "id", autoIncrement: true });
    // Create index to stop duplicates using Unique Composite Indexes
    emailStore.createIndex("uniqueEmailAndImage", ["email", "imageId"], { unique: true });
  }
}
// Open the Database only once function.
function openDatabase() {
  // Returns a promise to make the functions wait the DB to open
  return new Promise((resolve, reject) => {
    // If open, don't open again
    if (dbInstance) {
      return resolve(dbInstance);
    }
    // Open Database
    const request = indexedDB.open(imagesDatabaseName);
    // Same error message
    request.onerror = (event) => {
      reject(event.target.error);
    };
    // Make database if this is the first time.
    request.onupgradeneeded = (event) => {
      makeDatabaseStructure(event);
    };
    // Return database is open.
    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      // Handle unexpected close and reset cache. Browsers will force close if not used for a while.
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      // Return database instance.
      resolve(dbInstance);
    };
  });
}

// Database Main Functions =========
// Store Data
async function storeData(email, seed, imageId) {
  // Open database and handle it.
  const dbInstance = await openDatabase();

  return new Promise( async (resolve, reject) => {

    // Starts a transaction on images with write privileges
    const transactionImages = dbInstance.transaction("images", "readwrite");

    // Gets location of images table (in this DB, it is object oriented so it actually called a store.)
    const imagesTable = transactionImages.objectStore("images");

    // Add seed to table
    imagesTable.add({ image: seed });

    // Starts a transaction on images with write privileges
    const transactionEmails = dbInstance.transaction("emails", "readwrite");

    // Gets location of images table
    const emailsTable = transactionEmails.objectStore("emails");
    
    // Attempt to add email and imageId to table
    const addAttempt = emailsTable.add({ email: email, imageId: await imageId });

    // Catch duplicates
    addAttempt.onerror = (event) => {
      // I don't need to reject here as it is not an error. This is by design.
      // This is a duplicate so resolve still.
      statusContainer.innerHTML = "You have already saved this image to your email address";
      resolve();
    }

    // Successful attempt 
    addAttempt.onsuccess = (event) => {
      // Successfully saved 
      statusContainer.innerHTML = "Image added to your collection";
      resolve();
    }
  });
}
// Get images based on email address
async function getImages(email) {
  const dbInstance = await openDatabase();

  // Part one of two - This will get the imageIds from the emails Database
  // New Promise is for the cursor
  const imageIds = new Promise( (resolve, reject) => {

    const transaction = dbInstance.transaction("emails", "readonly");
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
  });

  // Part two of two - This will get the images based on ImageIds
  return imageIds.then( async (imageIds) => {
    return new Promise( (resolve, reject) => {
      // Read only this time
      const transaction = dbInstance.transaction("images", "readonly");
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

        // Make Array into a set for faster lookups
        const idSet = new Set(imageIds);

        // This will auto loop.
        if (cursor) {
          // imageIds are this email's images saved as Original Email ID
          // Cursor is all the images' ids.
          if (idSet.has(cursor.value.id)) {
            cursorValue.push(cursor.value);
          }
          cursor.continue(); // Move to the next matching record
        } else {
          resolve(cursorValue);
        }
      };
    });
  });
}

async function getImageIds() {
  const dbInstance = await openDatabase();

  return new Promise( ( resolve, reject ) => {
    const transaction = dbInstance.transaction("images", "readonly");
    const imagesTable = transaction.objectStore("images");

    countImages = imagesTable.count();

    countImages.onerror = (event) => {
      console.error("Counting Image Database entries failed: ", event.target.error?.message);
      reject(event.target.error);
    }

    countImages.onsuccess = (event) => {
      resolve((countImages.result + 1));
    }
  });
}
