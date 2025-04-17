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
let currentDBVersion = 1;
// Variable to store current image in
let currentBlob;
let currentImageId = getNewImageId(); // This is a promise

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
    if (!imageStored) {
      storeImage(currentBlob);
      imageStored = true;
    }
    storeImageReference(currentImageId, currentEmail);
    renderSavedImages(currentEmail);
  }
});
// Get New Image
newImageButton.addEventListener('click', async () => {
  saveImageButton.disabled = true;
  await fetchBlob(picsumURL);
  if (imageStored) {
    currentImageId = getNewImageId()
      .then( () => {saveImageButton.disabled = false} )
      .catch( (error) => {console.error("Error fetching currentImageId:", error)});
  } else {
    imageStored = false;
    saveImageButton.disabled = false;
  }
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
  const storedImages = await retrieveImages(email);
  if (typeof storedImages == "string") {
    console.log("Part 1 of Retrieved Images did not work.")
  }
  for (let i = 0, j = storedImages.length; i < j; i++) {
    if (!shownImages.includes(storedImages[i].id)) {
      const htmlImg = createImgContainer(storedImages[i].image);
      shownImages.push(storedImages[i].id);
      userSavedImages.appendChild( htmlImg );
    }
  }
}

// Database Functions ===============================
// Store image (in blob format) in database in browser (using indexedDB API)
function storeImage(blob) {
  // DB name to just make things easier to edit if needed.
  const databaseName = "userImages";

  // Open (or make) database with version number 1
  // returns IDBOpenDBRequest object
  const request = indexedDB.open(databaseName);
  // Handle error opening database
  request.onerror = (event) => {
    console.log(`Database error: ${event.target.error?.message}`);
  }

  // Event when database is created or version number has changed
  request.onupgradeneeded = (event) => {
    // The database instance
    const db = event.target.result;
    currentDBVersion = db.version;
    // Check for images table, if it doesn't exist, make it with id as primary key
    if (!db.objectStoreNames.contains("images")) {
      db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
    }
  };

  // If database opened successfully
  request.onsuccess = (event) => {
    // The database instance
    const db = event.target.result;
    currentDBVersion = db.version;
    // Starts a transaction on images with write privileges
    const transactionImages = db.transaction("images", "readwrite");

    // Gets location of images table (in this DB, it is object oriented so it actually called a store.)
    const imagesTable = transactionImages.objectStore("images");
    // Add blob to table
    imagesTable.add({ image: blob });

    transactionImages.oncomplete = () => {
      db.close();
    };
  }
};
// Store imageId to email table
function storeImageReference(imageId, email) {
  const databaseName = "userImages";
  const request = indexedDB.open(databaseName);

  request.onerror = (event) => {
    console.log(`Database error: ${event.target.error?.message}`);
  }

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    currentDBVersion = db.version;
    if (!db.objectStoreNames.contains("images")) {
      db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
    }

    if (!db.objectStoreNames.contains(email)) {
      const dbTable = db.createObjectStore(email, { keyPath: "id", autoIncrement: true });
      dbTable.createIndex("imageIndex", "imageId", { unique: true });
    }
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    currentDBVersion = db.version;
    if (!db.objectStoreNames.contains(email)) {
      db.close();
      makeNewEmailStore(databaseName, email, () => {
        storeImageReference(imageId, email);
      });
    } else {
      const transactionEmail = db.transaction(email, "readwrite");
      const emailTable = transactionEmail.objectStore(email);
      imageId
        .then( result => { 
          result++; // To counteract the zero and one index mess
          emailTable.add( { imageId: result} );})
        .catch( (error) => {console.error("Error fetching currentImageId in storeImageReference:", error);});
      
      transactionEmail.oncomplete = () => {
        db.close();
      };
    }
  }
};
// Retrieve Images from Database
async function retrieveImages(email) {
  const databaseName = "userImages";
  // Make new promise for cursor
  const imageIds = new Promise( (resolve, reject) => {
    const request = indexedDB.open(databaseName);

    request.onerror = (event) => {
      reject(`Database error: ${event.target.error?.message}`);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      currentDBVersion = db.version;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(email)) {
        const dbTable = db.createObjectStore(email, { keyPath: "id", autoIncrement: true });
        dbTable.createIndex("imageIndex", "imageId", { unique: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      currentDBVersion = db.version;

      if (!db.objectStoreNames.contains(email)) {
        db.close();
        makeNewEmailStore(databaseName, email, () => {
          retrieveImages(email);
        });
      } else {
        // Read only this time
        const transaction = db.transaction(email, "readonly");
        const emailTable = transaction.objectStore(email);
        const getRequest = emailTable.openCursor();

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
            cursorValue.push(cursor.value.imageId);
            cursor.continue(); // Move to the next matching record
          } else {
            resolve(cursorValue);
          }
        };
        transaction.oncomplete = () => {
          db.close();
        };
      }
    }
  });

  return imageIds.then( async (imageIds) => {
    if (typeof imageIds == "string") {
      return imageIds
    }
    return new Promise( (resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onerror = (event) => {
        reject(`Database error: ${event.target.error?.message}`);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        currentDBVersion = db.version;
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
        }
      };


      request.onsuccess = (event) => {
        const db = event.target.result;
        currentDBVersion = db.version;

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
        transaction.oncomplete = () => {
          db.close();
        };
      };
    });
  });
}
// Get next id number
function getNewImageId() {
  const databaseName = "userImages";
  const allImages = new Promise( (resolve, reject) => {
    const request = indexedDB.open(databaseName);

    // Event when database is created or version number has changed
    request.onupgradeneeded = (event) => {
      // The database instance
      const db = event.target.result;
      currentDBVersion = db.version;

      // Check for images table, if it doesn't exist, make it with id as primary key
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onerror = (event) => {
      reject(`Database error: ${event.target.error?.message}`);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      currentDBVersion = db.version;
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
          cursorValue.push(cursor.value);
          cursor.continue(); // Move to the next matching record
        } else {
          resolve(cursorValue);
        }
      };
      transaction.oncomplete = () => {
        db.close();
      };
    }
  });
  // It auto increments starting from 1... no comment
  return allImages.then( allImages => allImages.length);
}

// Database Helper functions =======
function makeNewEmailStore(databaseName, email, passthrough) {
  const updatedDB = indexedDB.open(databaseName, currentDBVersion + 1);
  updatedDB.onerror = (event) => {
    console.log(`Database error: ${event.target.error?.message}`);
  };
  updatedDB.onupgradeneeded = (event) => {
    const db = event.target.result;
    currentDBVersion = db.version;
    const dbTable = db.createObjectStore(email, { keyPath: "id", autoIncrement: true });
    dbTable.createIndex("imageIndex", "imageId", { unique: true });
  };
  updatedDB.onsuccess = (event) => {
    const db = event.target.result;
    currentDBVersion = db.version;
    db.close();
    passthrough();
  };
}
function makeNewImageStore(databaseName, passthrough) {
  const updatedDB = indexedDB.open(databaseName, currentDBVersion + 1);
  updatedDB.onerror = (event) => {
    console.log(`Database error: ${event.target.error?.message}`);
  };
  updatedDB.onupgradeneeded = (event) => {
    const db = event.target.result;
    currentDBVersion = db.version;
    const dbTable = db.createObjectStore(email, { keyPath: "id", autoIncrement: true });
    dbTable.createIndex("imageIndex", "imageId", { unique: true });
  };
}