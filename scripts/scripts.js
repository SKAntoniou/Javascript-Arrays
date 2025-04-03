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

// Variable to store current image in
let currentBlob;
// Run the function once to display one image when page loads.
fetchBlob(picsumURL);
let currentEmail = "";
let lastSave = {
  "email": "",
  "blob": ""
}
let shownImages = [];

// Submit Email
function submitFunction() {
  if (emailValid) {
    currentEmail = emailInput.value.toLowerCase();
    emailContainerMissing.style.display = "none";
    emailContainerVerified.style.display = "flex";
    emailContainerVerified.querySelector("#current-email").innerHTML = currentEmail;
    storeEmail(currentEmail);
    renderSavedImages(currentEmail);
  } else {
    emailInput.setCustomValidity(emailInvalidMessage);
    emailInput.reportValidity();
  }
}
emailSubmit.addEventListener('click', () => {
  submitFunction();
});
// Also submit on enter press.
emailInput.addEventListener("keypress", (e) => {
  if (e.key === 'Enter') {
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

// Fetch Functions ===================================================
function fetchData(url) {
  return fetch(url)
    .then(checkStatus())
    .then(res => res.json())
    .catch(error => console.log(`Failed to fetch an image from ${url} \n`, error))
}
function checkStatus(response) {
  if (response.ok) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(response.statusText));
  }
}

// Image and DB Functions ========================
// Get New Image
newImageButton.addEventListener('click', () => {
  fetchBlob(picsumURL);
});

// Save image on email using currentEmail variable
saveImageButton.addEventListener('click', async () => {
  if (currentEmail !== "") {
    // Check if is about to save a duplicate image and ignore it will.
    if (currentEmail !== lastSave.email || currentBlob !== lastSave.blob) {
      storeImage(currentBlob, currentEmail);
      renderSavedImages(currentEmail);
      retrieveEmails();
    }
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

// Retrieve Images then add them to userSavesImages Element
async function renderSavedImages(email) {
  const storedImages = await retrieveImages(email);
  for (let i = 0, j = storedImages.length; i < j; i++) {
    if (!shownImages.includes(storedImages[i].id)) {
      const htmlImg = createImgContainer(storedImages[i].image);
      shownImages.push(storedImages[i].id);
      userSavedImages.appendChild( htmlImg );
    }
  }
}

// Store image (in blob format) in database in browser (using indexedDB API)
function storeImage(blob, email) {
  // DB name to just make things easier to edit if needed.
  const databaseName = "userImages";

  // Open (or make) database with version number 1
  // returns IDBOpenDBRequest object
  const request = indexedDB.open(databaseName, 1);

  // Handle error opening database
  request.onerror = (event) => {
    console.log(`Database error: ${event.target.error?.message}`);
  }

  // Event when database is created or version number has changed
  request.onupgradeneeded = (event) => {
    // The database instance
    const db = event.target.result;

    // Check for images table, if it doesn't exist, make it with id as primary key
    if (!db.objectStoreNames.contains("images")) {
      const dbTable = db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      dbTable.createIndex("emailIndex", "email", { unique: false });
    } 

    // Check for email table, if it doesn't exist, make it with id as primary key
    if (!db.objectStoreNames.contains("emails")) {
      const dbTable = db.createObjectStore("emails", { keyPath: "id", autoIncrement: true });
      dbTable.createIndex("emailIndex", "email", { unique: true });
    }
  };

  // If database opened successfully
  request.onsuccess = (event) => {
    // The database instance
    const db = event.target.result;
    // Starts a transaction on images with write privileges
    const transactionImages = db.transaction("images", "readwrite");

    // Gets location of images table (in this DB, it is object oriented so it actually called a store.)
    const imagesTable = transactionImages.objectStore("images");
    // Add blob to table
    imagesTable.add({ email: email, image: blob });

    // Starts a transaction on emails with write privileges
    const transactionEmails = db.transaction("emails", "readwrite");

    // Gets location of email table
    const emailTable = transactionEmails.objectStore("emails");
    // Add email to table
    emailTable.add( { email: email} );


    // Save last image and email to not save duplicates
    lastSave.blob = blob;
    lastSave.email = email;

    // Can add error handling to print to the console here if last command gets assigned to a variable
  }
}

// Retrieve Images. The output should be stored in a variable. This needs to be async for cursor.
async function retrieveImages(email) {
  // Won't be repeating notes for this one, for notes on how this works, see the storeImages function. New commands will be noted.

  const databaseName = "userImages";

  // Make new promise for cursor
  return new Promise( (resolve, reject) => {

    const request = indexedDB.open(databaseName, 1);

    request.onerror = (event) => {
      reject(`Database error: ${event.target.error?.message}`);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      // In read only this time.
      const transaction = db.transaction("images", "readonly");
      const imagesTable = transaction.objectStore("images");

      // Define what column to search under
      const index = imagesTable.index("emailIndex");
      // Open a cursor object (special term for this type of DB) to search email column
      const getRequest = index.openCursor(IDBKeyRange.only(email));

      // Value array
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
    };
  });
}

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

// Store email in database in browser
function storeEmail(email) {
  // For notes, check the storeImages function.
  const databaseName = "userImages";
  const request = indexedDB.open(databaseName, 1);
  request.onerror = (event) => {
    console.log(`Database error: ${event.target.error?.message}`);
  }
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("images")) {
      const dbTable = db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      dbTable.createIndex("emailIndex", "email", { unique: false });
    } 
    if (!db.objectStoreNames.contains("emails")) {
      const dbTable = db.createObjectStore("emails", { keyPath: "id", autoIncrement: true });
      dbTable.createIndex("emailIndex", "email", { unique: true });
    }
  };
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transactionEmails = db.transaction("emails", "readwrite");
    const emailTable = transactionEmails.objectStore("emails");
    emailTable.add( { email: email} );

    // Can add error handling to print to the console here if last command gets assigned to a variable
  }

}

// Retrieve emails
async function retrieveEmails() {
  const databaseName = "userImages";

  return new Promise( (resolve, reject) => {

    const request = indexedDB.open(databaseName, 1);
    request.onerror = (event) => {
      reject(`Database error: ${event.target.error?.message}`);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      const transaction = db.transaction("emails", "readonly");
      const emailTable = transaction.objectStore("emails");


      // Define what column to search under
      const index = emailTable.index("emailIndex");
      // Open a cursor object with no filter
      const getRequest = index.openCursor();

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
    };
  });
}