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

const testImg = userSavedImages.querySelector(".test-img");

// When page loads - Add a random image.
genImageContainer.src = "https://picsum.photos/600/400?random=1";
genImageContainer.crossOrigin = "anonymous";


// genImageContainer.addEventListener('load', () => {

  newImageButton.addEventListener('click', () => {
    genImageContainer.src = "https://picsum.photos/600/400?random=1";
    genImageContainer.crossOrigin = "anonymous";
  })

  saveImageButton.addEventListener('click', () => {
    // genImageContainer.crossOrigin = "anonymous";
    const imgBase64Data = getBase64Image(genImageContainer);
    localStorage.setItem("imgData",imgBase64Data);
  
    let imgBase64DataCopy = localStorage.getItem('imgData');
    imgBase64DataCopy = "data:image/png;base64," + imgBase64DataCopy;

    userSavedImages.appendChild( createImgContainer(imgBase64DataCopy) );
  })
// })

// OLD method, maybe cause of clipping, trying blob now
function getBase64Image(img) {
  let canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  let ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  let dataURL = canvas.toDataURL("image/png");

  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}


function createImgContainer(imageData) {
  const htmlElement = document.createElement("img");
  htmlElement.classList.add("img");
  htmlElement.alt = "Random Image";
  htmlElement.src = imageData;
  return htmlElement;
}
