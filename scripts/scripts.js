// Light / Dark Mode Toggle ===================================================
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

// Random image fetch ===================================================
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

// Get New Image
newImageButton.addEventListener('click', () => {
  fetchBlob(picsumURL);
});

// Save image on email
saveImageButton.addEventListener('click', async () => {
  storeImage(currentBlob, "a@a.com");
  renderSavedImages("a@a.com");
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

// Store image (in blob format) in database in browser (using indexedDB API)
function storeImage(blob, email) {
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
  };

  // If database opened successfully
  request.onsuccess = (event) => {
    // The database instance
    const db = event.target.result;
    // Starts a transaction with write privileges
    const transaction = db.transaction("images", "readwrite");
    // Gets location of images table (in this DB, it is object oriented so it actually called a store.)
    const imagesTable = transaction.objectStore("images");
    // Add blob to table
    imagesTable.put({ email: email, image: blob });
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
          // console.log("Found:", cursor.value);
          cursor.continue(); // Move to the next matching record
        } else {
          resolve(cursorValue);
        }
      };
    };
  });
}

function createImgContainer(imageBlob) {
  const htmlElement = document.createElement("img");
  htmlElement.classList.add("img");
  htmlElement.alt = "Random Image";
  let url = window.URL || window.webkitURL;
  htmlElement.src = url.createObjectURL(imageBlob);
  htmlElement.crossOrigin = "anonymous";
  return htmlElement;
}

async function renderSavedImages(email) {
  const storedImages = await retrieveImages(email);
  for (let i = 0, j = storedImages.length; i < j; i++) {
    const htmlImg = createImgContainer(storedImages[i].image);
    userSavedImages.appendChild( htmlImg );
  }
}