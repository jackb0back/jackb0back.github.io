// --- Backend Integration Logic ---
const GAS_url = "https://script.google.com/macros/s/AKfycbwcoklBAqEyFhc5XibNc5viw6piv2vz2dIu_mb5QyZpBLw9xb4WPgCdfmPqd75302rd5w/exec";
let fetchedData = { blog: [], projects: [] };

class MasterDBRequest {
    constructor(route, body, enc) {
        this.encryption = enc || {};
        this.route = route;
        this.masterDB = GAS_url;
        this.requestBody = body;
        if (typeof this.requestBody == "object") this.requestBody = JSON.stringify(this.requestBody);
        this.response = null;
        if (enc && enc.username !== undefined && enc.hash !== undefined) {
            this.aesKey = CryptoJS.SHA256(enc.username + enc.hash).toString();
        }
    }
    async sendEncrypted() {
        this.response = await new Promise(async (resolve, reject) => {
            const formData = new FormData();
            console.log(this.requestBody, this.aesKey);

            const payload = {
                path: this.route,
                body: CryptoJS.AES.encrypt(this.requestBody, this.aesKey).toString(),
                enc: true,
                username: this.encryption.username
            }
            formData.append("path", payload.path);
            formData.append("body", payload.body);
            formData.append("enc", payload.enc);
            formData.append("username", payload.username);
            console.log("POSTING:", payload)

            fetch(this.masterDB, {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    console.log("Posted to " + this.masterDB);
                    console.log("Received:", result);
                    resolve(result);
                })
                .catch(error => {
                    console.log("Error posting to " + this.masterDB);
                    reject(error);
                })
        });
        return this.response;
    }
    async send() {
        this.response = await new Promise(async (resolve, reject) => {
            const formData = new FormData();
            formData.append("path", this.route);
            formData.append("body", this.requestBody);

            fetch(this.masterDB, {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    console.log("Posted to " + this.masterDB);
                    console.log("Received:", result);
                    resolve(result);
                })
                .catch(error => {
                    console.log("Error posting to " + this.masterDB);
                    reject(error);
                });
        });
        return this.response;
    }
}


function daysTo(dateString) {
    // Parse the input date string
    const [month, day] = dateString.split('/');
    const currentYear = new Date().getFullYear();
    const targetDate = new Date(currentYear, month - 1, day);

    // Get the current date
    const currentDate = new Date();

    // If the target date has already passed this year, set the target date to next year
    if (targetDate < currentDate) {
        targetDate.setFullYear(currentYear + 1);
    }

    // Calculate the time difference in milliseconds
    const timeDifference = targetDate - currentDate;

    // Convert the time difference from milliseconds to days
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return daysDifference;
}

function daysSince(dateString) {
    // Parse the input date string
    const [month, day, year] = dateString.split('/');
    const inputDate = new Date(year, month - 1, day);

    // Get the current date
    const currentDate = new Date();

    // Calculate the time difference in milliseconds
    const timeDifference = currentDate - inputDate;

    // Convert the time difference from milliseconds to days
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

    return daysDifference;
}

async function sendAnalytics() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();

        const req = new MasterDBRequest("uploadStats", { ip: data.ip });
        const result = await req.send();
        console.log('Successfully recorded analytics event', result);
    } catch (e) {
        console.error('Failed to get IP address for analytics:', e);
    }
}

function getAnalytics() {
    const req = new MasterDBRequest("getStats", {});
    req.send()
        .then(result => {
            document.getElementById("stat-site-views").textContent = result[0];
            document.getElementById("stat-total-views").textContent = result[1];
            document.getElementById("stat-days-update").textContent = daysSince(result[3]);
            document.getElementById("stat-days-blog").textContent = daysSince(result[4]);
            document.getElementById("stat-days-project").textContent = daysSince(result[5]);
            document.getElementById("stat-days-bday").textContent = daysTo("03/10");
        })
        .catch(err => console.error("Error fetching stats: ", err));
}

function parseData(arr) {
    let parsed = [];
    for (let i = 1; i < arr.length; i++) {
        if (!arr[i] || arr[i] === "") continue;
        try {
            parsed.push(JSON.parse(arr[i]));
        } catch (e) {
            console.error(e);
        }
    }
    return parsed;
}

async function getColumn(startCell) {
    const req = new MasterDBRequest("getColumn", { sheet: "Posts", cell: startCell });
    return req.send()
        .then(res => {
            console.log("Fetched " + startCell);
            return res.data;
        })
        .catch(err => console.error("Error fetching " + startCell, err));
}


function getAllCells(val, retName, callback) {
    const req = new MasterDBRequest("getAllValsIn", { column: val });
    req.send()
        .then(data => {
            console.log("Fetched " + val + " and placed it in fetchedData." + retName);
            fetchedData[retName] = parseData(data);
            callback();
        })
        .catch(err => console.error("Error fetching " + val, err));
}

function getProjects() {
    getAllCells("projects", "projects", function () {
        fetchedData["projects"].reverse();
        displayProjects();
    });
}

function displayProjects() {
    const grid = document.getElementById("projects-grid");
    const template = document.getElementById("template-project");
    grid.innerHTML = "";

    fetchedData.projects.forEach(proj => {
        const clone = template.content.cloneNode(true);

        const viewBtn = clone.querySelector(".proj-view");
        if (proj.view) {
            viewBtn.href = proj.view;
        } else {
            viewBtn.style.display = "none";
        }

        const dlBtn = clone.querySelector(".proj-download");
        if (proj.download) {
            dlBtn.href = proj.download;
        } else {
            dlBtn.style.display = "none";
        }

        const mediaContainer = clone.querySelector(".proj-media");
        let images = [];
        if (proj.img) {
            if (Array.isArray(proj.img) && proj.img.length > 0) {
                images = proj.img;
            } else if (typeof proj.img === "string" && proj.img.trim() !== "") {
                images = [proj.img];
            }
        }

        if (images.length > 0) {
            mediaContainer.style.display = "block";
            const carouselImg = clone.querySelector(".proj-carousel-img");
            const prevBtn = clone.querySelector(".prev-btn");
            const nextBtn = clone.querySelector(".next-btn");
            let currentIdx = 0;

            carouselImg.src = images[currentIdx];
            carouselImg.onclick = () => {
                window.open(images[currentIdx], "_blank");
            }
            if (images.length > 1) {
                prevBtn.style.display = "block";
                nextBtn.style.display = "block";

                prevBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    currentIdx = (currentIdx - 1 + images.length) % images.length;
                    carouselImg.src = images[currentIdx];
                });

                nextBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    currentIdx = (currentIdx + 1) % images.length;
                    carouselImg.src = images[currentIdx];
                });

            }
        }

        clone.querySelector(".proj-tit").textContent = proj.name;
        clone.querySelector(".proj-desc").innerHTML = proj.desc;
        clone.querySelector(".proj-date").textContent = proj.date;

        grid.appendChild(clone);
    });
}

function getBlog() {
    getAllCells("blog", "blog", () => {
        fetchedData.blog = sortByDate(fetchedData.blog).reverse();
        displayBlog();
    });
}

function sortByDate(arr) {
    return arr.sort((a, b) => {
        const [monthA, dayA, yearA] = a.date.split('/');
        const [monthB, dayB, yearB] = b.date.split('/');
        const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
        const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
        return dateA - dateB;
    });
}

function displayBlog() {
    const grid = document.getElementById("blog-grid");
    const template = document.getElementById("template-blog");
    grid.innerHTML = "";

    fetchedData.blog.forEach(d => {
        const clone = template.content.cloneNode(true);
        clone.querySelector(".blog-date").textContent = d.date;
        clone.querySelector(".blog-tit").textContent = d.title;
        try {
            clone.querySelector(".blog-cont").innerHTML = atob(d.cont);
        } catch (e) {
            console.error("Failed to decode base64 blog content");
        }
        grid.appendChild(clone);
    });

    for (let i = 0; i < $("pre").length; i++) {
        hljs.highlightElement($("pre")[i])
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize data fetches
    getAnalytics();
    getProjects();
    getBlog();
});
