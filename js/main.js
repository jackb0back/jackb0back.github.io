function calculateAge() {
  // Parse the birthdate string into a Date object
  const birthDate = new Date("2008-03-10");
  const today = new Date();

  // Calculate the initial difference in years
  let age = today.getFullYear() - birthDate.getFullYear();

  // Check the difference in months
  const monthDifference = today.getMonth() - birthDate.getMonth();

  // If the birthday hasn't happened yet this year, subtract 1 from the age
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}


document.addEventListener('DOMContentLoaded', () => {

  // --- SPA Router Logic ---
  function route() {
    let hash = window.location.hash || '#home';
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => {
      if ('#' + page.id === hash) {
        page.style.display = (page.id === 'socials') ? 'flex' : 'block';

        // Re-trigger fade-up animation
        page.classList.remove('fade-up');
        void page.offsetWidth; // trigger reflow
        page.classList.add('fade-up');
      } else {
        page.style.display = 'none';
      }
    });

    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Listen to hash changes globally
  window.addEventListener('hashchange', () => {
    route();
  });

  // Initial route
  route();

  // Mobile Nav Toggle
  const navToggle = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // --- Audio Logic ---
  const startupSound = document.getElementById('startup-sound');
  const bgMusic = document.getElementById('bg-music');
  let audioStarted = false;



  function initAudio() {
    if (audioStarted) return;

    const currentHash = window.location.hash || '#home';
    const playPromise = (currentHash === '#home')
      ? startupSound.play()
      : bgMusic.play();

    if (playPromise !== undefined) {
      playPromise.then(_ => {
        audioStarted = true;
        document.body.removeEventListener('click', initAudio);
        document.body.removeEventListener('keydown', initAudio);

        sendAnalytics();

        if (currentHash === '#home') {
          startupSound.onended = () => {
            bgMusic.volume = 0.5;
            bgMusic.play();
          };
        }
      }).catch(error => {
        // Browser blocked autoplay. Wait for user interaction.
      });
    }
  }

  // Any user interaction will attempt to initialize audio if not already started
  document.body.addEventListener('click', initAudio);
  document.body.addEventListener('keydown', initAudio);

  // --- Starfield Background Logic ---
  const canvas = document.createElement("canvas");
  canvas.id = "space";
  document.body.insertBefore(canvas, document.body.firstChild);
  const c = canvas.getContext("2d");

  const numStars = 2500;
  let focalLength = window.innerWidth * 2;
  let centerX, centerY;
  let stars = [];

  function initializeStars() {
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        o: '0.' + Math.floor(Math.random() * 99) + 1
      });
    }
  }

  function moveStars() {
    for (let i = 0; i < numStars; i++) {
      stars[i].z--;

      if (stars[i].z <= 0) {
        stars[i].z = canvas.width;
      }
    }
  }

  function drawStars() {
    // Resize to the screen
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      focalLength = canvas.width * 2;
      initializeStars();
    }

    // Clear canvas space to let CSS background show through
    c.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numStars; i++) {
      let star = stars[i];
      let pixelX = (star.x - centerX) * (focalLength / star.z) + centerX;
      let pixelY = (star.y - centerY) * (focalLength / star.z) + centerY;
      let pixelRadius = 1 * (focalLength / star.z);

      c.fillStyle = "rgba(209, 255, 255, " + star.o + ")";
      c.fillRect(pixelX, pixelY, pixelRadius, pixelRadius);
    }
  }

  function executeFrame() {
    requestAnimationFrame(executeFrame);
    moveStars();
    drawStars();
  }

  // Initialize and start animation
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initializeStars();
  executeFrame();


  $("#AGE").text(calculateAge());

});
