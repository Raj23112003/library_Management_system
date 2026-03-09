function saveUsers(users) {
localStorage.setItem("users", JSON.stringify(users))
}

const DAILY_STUDENT_CREDITS = 2

function todayDateKey() {
let now = new Date()
let y = now.getFullYear()
let m = String(now.getMonth() + 1).padStart(2, "0")
let d = String(now.getDate()).padStart(2, "0")
return `${y}-${m}-${d}`
}

function daysBetweenDateKeys(fromKey, toKey) {
let from = new Date(`${fromKey}T00:00:00`)
let to = new Date(`${toKey}T00:00:00`)
let diffMs = to.getTime() - from.getTime()
if (!Number.isFinite(diffMs) || diffMs <= 0) return 0
return Math.floor(diffMs / 86400000)
}

function getUsers() {
let users = JSON.parse(localStorage.getItem("users")) || []
let changed = false
let today = todayDateKey()

users.forEach(user => {
if (user.type === "Student" && typeof user.credits !== "number") {
user.credits = 10
changed = true
}

if (user.type === "Student" && !user.lastCreditRefresh) {
user.lastCreditRefresh = today
changed = true
}

if (user.type === "Student" && user.lastCreditRefresh) {
let elapsedDays = daysBetweenDateKeys(user.lastCreditRefresh, today)
if (elapsedDays > 0) {
user.credits = Number(user.credits || 0) + (elapsedDays * DAILY_STUDENT_CREDITS)
user.lastCreditRefresh = today
changed = true
}
}
})

if (changed) {
saveUsers(users)
}

return users
}

function getCurrentUsername() {
return localStorage.getItem("currentUser")
}

function setCurrentUsername(username) {
localStorage.setItem("currentUser", username)
}

function getCurrentUserRecord() {
let users = getUsers()
let username = getCurrentUsername()
let index = users.findIndex(u => u.username === username)

if (index === -1) {
return null
}

return { users, index, user: users[index] }
}

function getCurrentUserType() {
let record = getCurrentUserRecord()
return record ? record.user.type : ""
}

function canManageLibrary() {
let role = getCurrentUserType()
return role === "Faculty" || role === "Admin"
}

function isAdmin() {
return getCurrentUserType() === "Admin"
}

function getCustomBooks() {
return JSON.parse(localStorage.getItem("customBooks")) || []
}

function saveCustomBooks(books) {
localStorage.setItem("customBooks", JSON.stringify(books))
}

function getBorrowHistory() {
return JSON.parse(localStorage.getItem("borrowHistory")) || []
}

function saveBorrowHistory(history) {
localStorage.setItem("borrowHistory", JSON.stringify(history))
}

function getCreditHistory() {
return JSON.parse(localStorage.getItem("creditHistory")) || []
}

function saveCreditHistory(history) {
localStorage.setItem("creditHistory", JSON.stringify(history))
}

function getIssuedBooks() {
return JSON.parse(localStorage.getItem("issuedBooks")) || []
}

function normalizeBookKey(title, author) {
let t = (title || "").toString().trim().toLowerCase()
let a = (author || "").toString().trim().toLowerCase()
return `${t}::${a}`
}

function getDefaultTotalCopies(book) {
if (book && Number.isFinite(Number(book.totalCopies)) && Number(book.totalCopies) > 0) {
return Math.floor(Number(book.totalCopies))
}
return 5
}

function getBorrowedCountMap() {
let map = {}
getIssuedBooks().forEach(book => {
let key = normalizeBookKey(book.title, book.author)
map[key] = (map[key] || 0) + 1
})
return map
}

function getStatusInfo(title, author, totalCopies) {
let borrowedMap = getBorrowedCountMap()
let key = normalizeBookKey(title, author)
let borrowed = borrowedMap[key] || 0
let available = Math.max(0, totalCopies - borrowed)
return { borrowed, available }
}

function register() {
let username = document.getElementById("regUser").value.trim()
let password = document.getElementById("regPass").value.trim()
let type = document.getElementById("userType").value
let schoolId = document.getElementById("schoolId").value.trim()
let users = getUsers()

if (!username || !password || !schoolId) {
alert("Username, password and School ID are required")
return
}

if (type === "Admin" && schoolId !== "2003") {
alert("School id wrong")
return
}

if (type === "Faculty" && !(/^001-000[1-9]$/.test(schoolId) || schoolId === "001-0010")) {
alert("School id wrong")
return
}

if (users.some(u => u.username === username || u.schoolId === schoolId)) {
alert("Account already exists")
return
}

users.push({
username,
password,
type,
schoolId,
fullName: "",
email: "",
bio: "",
credits: type === "Student" ? 10 : 0,
lastCreditRefresh: type === "Student" ? todayDateKey() : ""
})

saveUsers(users)
setCurrentUsername(username)

alert("Registration successful. You are now logged in.")
window.location = "dashboard.html"
}

function login() {
let username = document.getElementById("loginUser").value.trim()
let password = document.getElementById("loginPass").value.trim()
let selectedType = document.getElementById("loginType").value
let users = getUsers()

let user = users.find(u => u.username === username && u.password === password)

if (!user) {
alert("Invalid login")
return
}

if (selectedType !== user.type) {
alert("Selected role does not match this account")
return
}

setCurrentUsername(username)
window.location = "dashboard.html"
}

function logout() {
localStorage.removeItem("currentUser")
window.location = "index.html"
}

function ensureAuthenticated() {
let protectedPages = [
"dashboard.html",
"search.html",
"recommendation.html",
"issued.html",
"profile.html",
"addbook.html",
"borrowed.html",
"allbooks.html",
"recently-added.html",
"featured-books.html",
"most-borrowed.html",
"remove-book.html",
"users.html"
]

let currentPage = window.location.pathname.split("/").pop().toLowerCase()

if (protectedPages.includes(currentPage) && !getCurrentUsername()) {
window.location = "index.html"
return
}

if ((currentPage === "addbook.html" || currentPage === "remove-book.html" || currentPage === "borrowed.html" || currentPage === "allbooks.html") && !canManageLibrary()) {
window.location = "dashboard.html"
}

if (currentPage === "users.html" && !isAdmin()) {
window.location = "dashboard.html"
}

if (currentPage === "issued.html" && getCurrentUserType() !== "Student") {
window.location = "allbooks.html"
}
}

function buildProfileMenu() {
let dropdown = document.getElementById("profileDropdown")
if (!dropdown) return

let role = getCurrentUserType()
let record = getCurrentUserRecord()
let mobileMenu = window.matchMedia("(max-width: 760px)").matches
let accountLink = { href: "profile.html", label: "Account Details" }
let links = [
{ href: "dashboard.html", label: "Dashboard" }
]

if (role === "Faculty") {
links.push({ href: "search.html", label: "Search" })
links.push({ href: "addbook.html", label: "Add Book" })
links.push({ href: "remove-book.html", label: "Remove Book" })
links.push({ href: "allbooks.html", label: "All Books Status" })
links.push({ href: "borrowed.html", label: "Credit Distribution" })
} else if (role === "Admin") {
links.push({ href: "search.html", label: "Search" })
links.push({ href: "recommendation.html", label: "Recommendations" })
links.push({ href: "addbook.html", label: "Add Book" })
links.push({ href: "remove-book.html", label: "Remove Book" })
links.push({ href: "allbooks.html", label: "All Books Status" })
links.push({ href: "borrowed.html", label: "Borrowed Info" })
links.push({ href: "users.html", label: "Users List" })
} else {
links.push({ href: "search.html", label: "Search" })
links.push({ href: "recommendation.html", label: "Recommendations" })
links.push({ href: "issued.html", label: "My Borrowed Books" })
}

if (mobileMenu) {
let navbarLinks = Array.from(document.querySelectorAll(".navbar a"))
navbarLinks.forEach(anchor => {
if (anchor.closest("#profileDropdown")) return
let href = anchor.getAttribute("href")
if (!href) return
let label = anchor.textContent.trim()
if (!label) return
if (!links.some(item => item.href === href)) {
links.push({ href, label })
}
})
}

if (!links.some(item => item.href === accountLink.href)) {
links.push(accountLink)
}

dropdown.innerHTML = ""
if (mobileMenu && record) {
let name = record.user.fullName || record.user.username
dropdown.innerHTML += `<div class="profile-dropdown-header">${name} (${record.user.type})</div>`
}
links.forEach(link => {
dropdown.innerHTML += `<a href="${link.href}">${link.label}</a>`
})
}

function setNavProfileInfo() {
let profileButton = document.getElementById("navUserBtn")
if (!profileButton) return

let record = getCurrentUserRecord()
if (!record) return

let name = record.user.fullName || record.user.username
let label = `${name} (${record.user.type})`
if (window.matchMedia("(max-width: 760px)").matches) {
profileButton.innerText = ""
profileButton.removeAttribute("title")
} else {
profileButton.innerText = label
profileButton.setAttribute("title", label)
}
profileButton.setAttribute("aria-label", "Navigation menu")
}

function toggleProfileMenu() {
let menu = document.getElementById("profileMenu")
if (!menu) return
menu.classList.toggle("open")
}

function closeProfileMenu() {
let menu = document.getElementById("profileMenu")
if (!menu) return
menu.classList.remove("open")
}

function initProfileMenu() {
let menu = document.getElementById("profileMenu")
if (!menu) return

document.addEventListener("click", function(event) {
if (!menu.contains(event.target)) {
closeProfileMenu()
}
})
}

let navSearchTimer = null
let navSearchRequestId = 0

function goToSearchPage(query) {
let text = query.trim()
if (!text) return
window.location = `search.html?q=${encodeURIComponent(text)}`
}

function clearNavSearchResults() {
let results = document.getElementById("navSearchResults")
if (!results) return
results.innerHTML = ""
results.classList.remove("open")
}

function renderNavSearchResults(books, query) {
let results = document.getElementById("navSearchResults")
if (!results) return

results.innerHTML = ""

if (!books.length) {
results.innerHTML = `<div class="nav-search-empty">No matches for "${query}"</div>`
results.classList.add("open")
return
}

books.forEach(book => {
let item = document.createElement("button")
item.type = "button"
item.className = "nav-search-item"

let title = document.createElement("span")
title.className = "nav-search-title"
title.textContent = book.title || "Untitled"

let meta = document.createElement("span")
meta.className = "nav-search-meta"
meta.textContent = book.genre || (book.author_name && book.author_name[0]) || "Unknown"

item.appendChild(title)
item.appendChild(meta)
item.addEventListener("click", function() {
goToSearchPage(book.title || query)
})

results.appendChild(item)
})

results.classList.add("open")
}

async function searchNavbarBooks(query, requestId) {
try {
let response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`)
let data = await response.json()

if (requestId !== navSearchRequestId) return

let custom = getCustomBooks().filter(book => {
let hay = `${book.title} ${book.author} ${book.genre}`.toLowerCase()
return hay.includes(query.toLowerCase())
}).map(book => ({
title: book.title,
author_name: [book.author],
genre: book.genre
}))

renderNavSearchResults(custom.concat(data.docs).slice(0, 6), query)
} catch (error) {
clearNavSearchResults()
}
}

function initNavSearch() {
let input = document.getElementById("navSearchInput")
let results = document.getElementById("navSearchResults")
if (!input || !results) return

input.addEventListener("input", function() {
let query = input.value.trim()
clearTimeout(navSearchTimer)

if (!query) {
clearNavSearchResults()
return
}

navSearchTimer = setTimeout(function() {
navSearchRequestId += 1
searchNavbarBooks(query, navSearchRequestId)
}, 220)
})

input.addEventListener("keydown", function(event) {
if (event.key === "Enter") {
event.preventDefault()
goToSearchPage(input.value)
}
})

document.addEventListener("click", function(event) {
if (!results.contains(event.target) && event.target !== input) {
results.classList.remove("open")
}
})
}

function computeRequiredCredits(book) {
if (typeof book.requiredCredits === "number") {
return Math.max(1, Math.floor(book.requiredCredits))
}

if (book.number_of_pages_median) {
let pages = Number(book.number_of_pages_median)
return Math.min(8, Math.max(1, Math.ceil(pages / 120)))
}

let title = (book.title || "").toString()
let hash = 0
for (let i = 0; i < title.length; i++) {
hash = (hash + title.charCodeAt(i)) % 5
}
return hash + 1
}

function renderBooks(container, books) {
container.innerHTML = ""
let role = getCurrentUserType()

books.forEach(book => {
let cover = book.cover || (
book.cover_i
? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
: "https://via.placeholder.com/150"
)

let title = book.title || "Untitled"
let author = book.author || (book.author_name ? book.author_name[0] : "Unknown")
let genre = book.genre || (book.subject && book.subject[0]) || "General"
let requiredCredits = computeRequiredCredits(book)
let totalCopies = getDefaultTotalCopies(book)
let status = getStatusInfo(title, author, totalCopies)
let statusText = status.available > 0
? `Status: Available (${status.available} available)`
: "Status: Borrowed"

if (role === "Faculty" || role === "Admin") {
statusText = `Status: Borrowed (${status.borrowed}) | Available (${status.available})`
}

container.innerHTML += `
<div class="book-card"
onclick='openBook(${JSON.stringify(title)},${JSON.stringify(author)},${JSON.stringify(cover)},${requiredCredits},${JSON.stringify(genre)},${totalCopies})'>
<img src="${cover}">
<div class="book-title">${title}</div>
<div class="book-author">${author}</div>
<div class="book-author">Credits: ${requiredCredits}</div>
<div class="book-author">${statusText}</div>
</div>
`
})
}

function openBook(title, author, cover, requiredCredits, genre, totalCopies) {
let modal = document.getElementById("bookModal")
if (!modal) return

document.getElementById("modalTitle").innerText = title
document.getElementById("modalAuthor").innerText = author
document.getElementById("modalCover").src = cover

let creditsEl = document.getElementById("modalCredits")
if (creditsEl) {
creditsEl.innerText = `Required credits: ${requiredCredits}`
}

let genreEl = document.getElementById("modalGenre")
if (genreEl) {
genreEl.innerText = `Genre: ${genre || "General"}`
}

let status = getStatusInfo(title, author, Number(totalCopies || 5))
let statusEl = document.getElementById("modalStatus")
if (statusEl) {
let role = getCurrentUserType()
if (role === "Faculty" || role === "Admin") {
statusEl.innerText = `Status: Borrowed (${status.borrowed}) | Available (${status.available})`
} else {
statusEl.innerText = status.available > 0
? `Status: Available (${status.available} available)`
: "Status: Borrowed"
}
}

modal.dataset.requiredCredits = requiredCredits
modal.dataset.totalCopies = Number(totalCopies || 5)

let issueBtn = modal.querySelector("button")
if (issueBtn) {
let isStudent = getCurrentUserType() === "Student"
issueBtn.disabled = !isStudent
issueBtn.innerText = isStudent ? "Borrow Book" : "Students Only"
}

modal.style.display = "flex"
}

function closeModal() {
let modal = document.getElementById("bookModal")
if (modal) {
modal.style.display = "none"
}
}

function issueCurrentBook() {
let modal = document.getElementById("bookModal")
if (!modal) return

let title = document.getElementById("modalTitle").innerText
let author = document.getElementById("modalAuthor").innerText
let cover = document.getElementById("modalCover").src
let requiredCredits = Number(modal.dataset.requiredCredits || 1)
let totalCopies = Number(modal.dataset.totalCopies || 5)
let record = getCurrentUserRecord()
if (!record) return

if (record.user.type !== "Student") {
alert("Only students can borrow books")
return
}

let status = getStatusInfo(title, author, totalCopies)
if (status.available <= 0) {
alert("This book is currently borrowed out")
return
}

let available = Number(record.user.credits || 0)
if (available < requiredCredits) {
alert(`Not enough credits. Required: ${requiredCredits}, Available: ${available}`)
return
}

record.users[record.index].credits = available - requiredCredits
saveUsers(record.users)

let issued = getIssuedBooks()
issued.push({
title,
author,
cover,
requiredCredits,
totalCopies,
borrowedBy: record.user.username,
borrowedByType: record.user.type,
borrowedBySchoolId: record.user.schoolId || "",
issuedAt: new Date().toISOString()
})
localStorage.setItem("issuedBooks", JSON.stringify(issued))

let history = getBorrowHistory()
let existing = history.find(item => item.title === title && item.author === author)
if (existing) {
existing.count += 1
} else {
history.push({ title, author, cover, count: 1, requiredCredits })
}
saveBorrowHistory(history)

alert("Book borrowed successfully")
closeModal()
loadProfile()
loadMostBorrowedBooks()
}

function loadIssuedBooks() {
let container = document.getElementById("issuedBooks")
if (!container) return

let books = getIssuedBooks()
let currentUser = getCurrentUsername()
let role = getCurrentUserType()
let heading = document.getElementById("issuedHeading")
if (heading) {
heading.innerText = role === "Student" ? "My Borrowed Books" : "Borrowed Books"
}

container.innerHTML = ""

books.forEach((book, index) => {
let visible = role === "Faculty" || role === "Admin" || book.borrowedBy === currentUser
if (!visible) return

let borrower = (role === "Faculty" || role === "Admin")
? `<div class="book-author">Borrowed by: ${book.borrowedBy} (${book.borrowedByType})</div>`
: ""

container.innerHTML += `
<div class="book-card">
<img src="${book.cover}">
<div class="book-title">${book.title}</div>
<div class="book-author">${book.author}</div>
<div class="book-author">Used credits: ${book.requiredCredits || 1}</div>
${borrower}
<button onclick="returnBookByGlobalIndex(${index})">Return</button>
</div>
`
})
}

function returnBookByGlobalIndex(index) {
if (typeof index !== "number") return

let books = JSON.parse(localStorage.getItem("issuedBooks")) || []
books.splice(index, 1)
localStorage.setItem("issuedBooks", JSON.stringify(books))
loadIssuedBooks()
loadBorrowedInfo()
}

function loadProfile() {
let form = document.getElementById("profileForm")
if (!form) return

let record = getCurrentUserRecord()
if (!record) {
window.location = "index.html"
return
}

let borrowedBooks = JSON.parse(localStorage.getItem("issuedBooks")) || []
let myBorrowedCount = borrowedBooks.filter(book => book.borrowedBy === record.user.username).length

document.getElementById("profileUsername").value = record.user.username
document.getElementById("profileSchoolId").value = record.user.schoolId || ""
document.getElementById("profileFullName").value = record.user.fullName || ""
document.getElementById("profileEmail").value = record.user.email || ""
document.getElementById("profileType").value = record.user.type || "Student"
document.getElementById("profileBio").value = record.user.bio || ""

let summaryCard = document.querySelector(".summary-card")
if (summaryCard) {
summaryCard.style.display = record.user.type === "Student" ? "block" : "none"
}

document.getElementById("borrowedCount").innerText = myBorrowedCount

let creditEl = document.getElementById("currentCredits")
if (creditEl) {
creditEl.innerText = record.user.type === "Student" ? (record.user.credits || 0) : "-"
}
}

function saveProfile() {
let record = getCurrentUserRecord()
if (!record) return

let fullName = document.getElementById("profileFullName").value.trim()
let email = document.getElementById("profileEmail").value.trim()
let bio = document.getElementById("profileBio").value.trim()
let newPassword = document.getElementById("profilePassword").value.trim()

if (email && !email.includes("@")) {
alert("Enter a valid email address")
return
}

if (newPassword && newPassword.length < 4) {
alert("New password must be at least 4 characters")
return
}

record.users[record.index].fullName = fullName
record.users[record.index].email = email
record.users[record.index].bio = bio

if (newPassword) {
record.users[record.index].password = newPassword
}

saveUsers(record.users)
setNavProfileInfo()
document.getElementById("profilePassword").value = ""
alert("Profile updated")
}

function deleteAccount() {
let record = getCurrentUserRecord()
if (!record) return

let confirmed = confirm("Delete your account permanently?")
if (!confirmed) return

record.users.splice(record.index, 1)
saveUsers(record.users)
localStorage.removeItem("currentUser")
window.location = "index.html"
}

function addBook() {
let titleInput = document.getElementById("bookName")
let authorInput = document.getElementById("author")
let genreInput = document.getElementById("genre")
let coverInput = document.getElementById("cover")
let creditsInput = document.getElementById("requiredCredits")
let copiesInput = document.getElementById("totalCopies")
if (!titleInput || !authorInput || !genreInput || !coverInput || !creditsInput || !copiesInput) return

let title = titleInput.value.trim()
let author = authorInput.value.trim()
let genre = genreInput.value.trim()
let cover = coverInput.value.trim() || "https://via.placeholder.com/150"
let requiredCredits = Number(creditsInput.value || 1)
let totalCopies = Number(copiesInput.value || 5)

if (!title || !author || !genre) {
alert("Title, author and genre are required")
return
}

if (!Number.isFinite(requiredCredits) || requiredCredits < 1) {
alert("Required credits must be at least 1")
return
}

if (!Number.isFinite(totalCopies) || totalCopies < 1) {
alert("Total copies must be at least 1")
return
}

let books = getCustomBooks()
books.push({
title,
author,
genre,
cover,
requiredCredits: Math.floor(requiredCredits),
totalCopies: Math.floor(totalCopies)
})
saveCustomBooks(books)

titleInput.value = ""
authorInput.value = ""
genreInput.value = ""
coverInput.value = ""
creditsInput.value = "1"
copiesInput.value = "5"

loadCustomBooksList()
alert("Book added successfully")
}

function loadCustomBooksList() {
let list = document.getElementById("customBookList")
if (!list) return

let books = getCustomBooks()
list.innerHTML = ""

if (!books.length) {
list.innerHTML = `<p class="muted-text">No custom books added yet.</p>`
return
}

books.forEach((book, index) => {
list.innerHTML += `
<div class="simple-list-item">
<span>${book.title} - ${book.author} (${book.genre}) | Credits: ${book.requiredCredits || 1} | Copies: ${book.totalCopies || 5}</span>
<button type="button" onclick="removeCustomBook(${index})">Remove</button>
</div>
`
})
}

function removeCustomBook(index) {
let books = getCustomBooks()
books.splice(index, 1)
saveCustomBooks(books)
loadCustomBooksList()
loadRemoveBooksList()
}

function loadRemoveBooksList() {
let list = document.getElementById("removeBookList")
if (!list) return

let books = getCustomBooks()
list.innerHTML = ""

if (!books.length) {
list.innerHTML = `<p class="muted-text">No custom books available to remove.</p>`
return
}

books.forEach((book, index) => {
list.innerHTML += `
<div class="simple-list-item">
<span>${book.title} - ${book.author} (${book.genre})</span>
<button type="button" onclick="removeCustomBook(${index})">Remove</button>
</div>
`
})
}

function loadUsersList() {
let studentsBody = document.getElementById("studentsTableBody")
let facultyBody = document.getElementById("facultyTableBody")
if (!studentsBody || !facultyBody) return

let users = getUsers()
let students = users.filter(user => user.type === "Student")
let faculty = users.filter(user => user.type === "Faculty")

studentsBody.innerHTML = ""
facultyBody.innerHTML = ""

if (!students.length) {
studentsBody.innerHTML = `<tr><td colspan="4">No students found.</td></tr>`
} else {
students.forEach(user => {
studentsBody.innerHTML += `
<tr>
<td>${user.username}</td>
<td>${user.schoolId || "-"}</td>
<td>${user.email || "-"}</td>
<td>${user.credits || 0}</td>
</tr>
`
})
}

if (!faculty.length) {
facultyBody.innerHTML = `<tr><td colspan="3">No faculty found.</td></tr>`
} else {
faculty.forEach(user => {
facultyBody.innerHTML += `
<tr>
<td>${user.username}</td>
<td>${user.schoolId || "-"}</td>
<td>${user.email || "-"}</td>
</tr>
`
})
}
}

function loadBorrowedInfo() {
let tbody = document.getElementById("borrowedTableBody")
if (!tbody) return

let books = JSON.parse(localStorage.getItem("issuedBooks")) || []
let studentBooks = books.filter(book => book.borrowedByType === "Student")

tbody.innerHTML = ""

if (!studentBooks.length) {
tbody.innerHTML = `<tr><td colspan="6">No student borrow records found.</td></tr>`
return
}

studentBooks.forEach(book => {
let issuedDate = book.issuedAt ? new Date(book.issuedAt).toLocaleDateString() : "-"
tbody.innerHTML += `
<tr>
<td>${book.borrowedBy}</td>
<td>${book.borrowedBySchoolId || "-"}</td>
<td>${book.title}</td>
<td>${book.author}</td>
<td>${book.requiredCredits || 1}</td>
<td>${issuedDate}</td>
</tr>
`
})
}

function loadStudentCreditTools() {
let select = document.getElementById("creditStudent")
if (!select) return

let users = getUsers().filter(user => user.type === "Student")
select.innerHTML = ""

users.forEach(student => {
select.innerHTML += `<option value="${student.username}">${student.username} (${student.schoolId})</option>`
})
}

function grantCredits() {
let select = document.getElementById("creditStudent")
let amountInput = document.getElementById("creditAmount")
let actionSelect = document.getElementById("creditAction")
if (!select || !amountInput || !actionSelect) return

let username = select.value
let amount = Number(amountInput.value)
let action = actionSelect.value

if (!username || !Number.isFinite(amount) || amount <= 0) {
alert("Enter a valid credit amount")
return
}

let users = getUsers()
let index = users.findIndex(user => user.username === username && user.type === "Student")
if (index === -1) {
alert("Student not found")
return
}

let current = Number(users[index].credits || 0)
let delta = Math.floor(amount)
let nextCredits = current

if (action === "remove") {
nextCredits = Math.max(0, current - delta)
users[index].credits = nextCredits
} else {
nextCredits = current + delta
users[index].credits = nextCredits
}

saveUsers(users)

let actorRecord = getCurrentUserRecord()
let history = getCreditHistory()
history.push({
actor: actorRecord ? actorRecord.user.username : "Unknown",
action,
student: users[index].username,
amount: delta,
resultingCredits: nextCredits,
changedAt: new Date().toISOString()
})
saveCreditHistory(history)

amountInput.value = ""
loadStudentCreditTools()
loadCreditHistory()
alert(action === "remove" ? "Credits removed" : "Credits granted")
}

function loadCreditHistory() {
let tbody = document.getElementById("creditHistoryBody")
if (!tbody) return

let history = getCreditHistory().slice().reverse().slice(0, 20)
tbody.innerHTML = ""

if (!history.length) {
tbody.innerHTML = `<tr><td colspan="6">No credit changes yet.</td></tr>`
return
}

history.forEach(item => {
let dt = item.changedAt ? new Date(item.changedAt).toLocaleString() : "-"
let action = item.action === "remove" ? "Removed" : "Added"
tbody.innerHTML += `
<tr>
<td>${item.actor || "-"}</td>
<td>${action}</td>
<td>${item.student || "-"}</td>
<td>${item.amount || 0}</td>
<td>${item.resultingCredits || 0}</td>
<td>${dt}</td>
</tr>
`
})
}

function loadMostBorrowedBooks() {
let section = document.getElementById("mostBorrowedSection")
let grid = document.getElementById("mostBorrowedBooks")
if (!section || !grid) return

let role = getCurrentUserType()
if (role !== "Student") {
section.style.display = "none"
return
}

section.style.display = "block"
renderMostBorrowedGrid("mostBorrowedBooks", 6)
}

function loadRecentlyAddedBooks() {
let section = document.getElementById("recentlyAddedSection")
let grid = document.getElementById("recentlyAddedBooks")
if (!section || !grid) return

let customBooks = getCustomBooks()
let recent = customBooks.slice().reverse().slice(0, 6)
grid.innerHTML = ""

if (!recent.length) {
grid.innerHTML = `<p class="muted-text">No custom books added yet.</p>`
return
}

recent.forEach(book => {
let cover = book.cover || "https://via.placeholder.com/150"
grid.innerHTML += `
<div class="book-card"
onclick='openBook(${JSON.stringify(book.title)},${JSON.stringify(book.author)},${JSON.stringify(cover)},${computeRequiredCredits(book)},${JSON.stringify(book.genre || "General")},${getDefaultTotalCopies(book)})'>
<img src="${cover}">
<div class="book-title">${book.title}</div>
<div class="book-author">${book.author}</div>
<div class="book-author">${book.genre || "General"}</div>
</div>
`
})
}

function renderMostBorrowedGrid(targetId, limit) {
let grid = document.getElementById(targetId)
if (!grid) return

let history = getBorrowHistory().sort((a, b) => b.count - a.count).slice(0, limit)
grid.innerHTML = ""

if (!history.length) {
grid.innerHTML = `<p class="muted-text">No borrow history yet.</p>`
return
}

history.forEach(book => {
grid.innerHTML += `
<div class="book-card">
<img src="${book.cover || "https://via.placeholder.com/150"}">
<div class="book-title">${book.title}</div>
<div class="book-author">${book.author}</div>
<div class="book-author">Borrowed ${book.count} times</div>
</div>
`
})
}

function loadMostBorrowedBooksPage() {
renderMostBorrowedGrid("mostBorrowedBooksPage", 30)
}

function loadRecentlyAddedBooksPage() {
let grid = document.getElementById("recentlyAddedBooksPage")
if (!grid) return

let recent = getCustomBooks().slice().reverse()
grid.innerHTML = ""

if (!recent.length) {
grid.innerHTML = `<p class="muted-text">No custom books added yet.</p>`
return
}

recent.forEach(book => {
let cover = book.cover || "https://via.placeholder.com/150"
grid.innerHTML += `
<div class="book-card"
onclick='openBook(${JSON.stringify(book.title)},${JSON.stringify(book.author)},${JSON.stringify(cover)},${computeRequiredCredits(book)},${JSON.stringify(book.genre || "General")},${getDefaultTotalCopies(book)})'>
<img src="${cover}">
<div class="book-title">${book.title}</div>
<div class="book-author">${book.author}</div>
<div class="book-author">${book.genre || "General"}</div>
</div>
`
})
}

async function loadFeaturedBooksPage() {
let grid = document.getElementById("featuredBooksPage")
if (!grid) return

grid.innerHTML = ""
let seen = {}
let bucket = []
let tries = 0

let custom = getCustomBooks().slice().reverse()
custom.forEach(book => {
if (bucket.length >= 30) return
let key = normalizeBookKey(book.title, book.author)
if (seen[key]) return
seen[key] = true
bucket.push({
title: book.title,
author: book.author,
cover: book.cover,
requiredCredits: book.requiredCredits,
genre: book.genre,
totalCopies: book.totalCopies
})
})

while (bucket.length < 30 && tries < 20) {
tries += 1
let docs = await fetchRandomHomeBatch(24)
docs.forEach(book => {
if (bucket.length >= 30) return
let title = book.title || "Untitled"
let author = book.author || (book.author_name ? book.author_name[0] : "Unknown")
let key = normalizeBookKey(title, author)
if (seen[key]) return
seen[key] = true
bucket.push(book)
})
}

appendBookCards(grid, bucket.slice(0, 30))
}

let homeFeedState = {
page: 1,
done: false,
loading: false,
items: [],
active: true,
max: 120,
seen: {}
}

let recommendationFeedState = {
page: 1,
done: false,
loading: false,
items: []
}

async function fetchFeedPage(query, page, limit) {
let response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
let data = await response.json()
return data.docs || []
}

const RANDOM_BOOK_QUERIES = [
"fiction",
"science",
"history",
"technology",
"mystery",
"fantasy",
"romance",
"biography",
"psychology",
"philosophy",
"adventure",
"art",
"economics",
"mathematics",
"education"
]

function pickRandomQuery() {
let index = Math.floor(Math.random() * RANDOM_BOOK_QUERIES.length)
return RANDOM_BOOK_QUERIES[index]
}

async function fetchRandomHomeBatch(limit = 20) {
let query = pickRandomQuery()
let randomPage = 1 + Math.floor(Math.random() * 30)
return fetchFeedPage(query, randomPage, limit)
}

function appendBookCards(container, books) {
let role = getCurrentUserType()

books.forEach(book => {
let cover = book.cover || (
book.cover_i
? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
: "https://via.placeholder.com/150"
)

let title = book.title || "Untitled"
let author = book.author || (book.author_name ? book.author_name[0] : "Unknown")
let genre = book.genre || (book.subject && book.subject[0]) || "General"
let requiredCredits = computeRequiredCredits(book)
let totalCopies = getDefaultTotalCopies(book)
let status = getStatusInfo(title, author, totalCopies)
let statusText = status.available > 0
? `Status: Available (${status.available} available)`
: "Status: Borrowed"

if (role === "Faculty" || role === "Admin") {
statusText = `Status: Borrowed (${status.borrowed}) | Available (${status.available})`
}

container.innerHTML += `
<div class="book-card"
onclick='openBook(${JSON.stringify(title)},${JSON.stringify(author)},${JSON.stringify(cover)},${requiredCredits},${JSON.stringify(genre)},${totalCopies})'>
<img src="${cover}">
<div class="book-title">${title}</div>
<div class="book-author">${author}</div>
<div class="book-author">Credits: ${requiredCredits}</div>
<div class="book-author">${statusText}</div>
</div>
`
})
}

async function loadHomeBooks(reset = false) {
let grid = document.getElementById("homeBooks")
if (!grid) return
let loadingText = document.getElementById("homeBooksLoading")

if (reset) {
homeFeedState = { page: 1, done: false, loading: false, items: [], active: true, max: 120, seen: {} }
grid.innerHTML = ""

let hint = document.getElementById("featuredHint")
if (hint) {
hint.style.display = "none"
}
}

if (homeFeedState.loading || homeFeedState.done) return
if (!homeFeedState.active) return

homeFeedState.loading = true
if (loadingText) loadingText.style.display = "block"

try {
let docs = await fetchRandomHomeBatch(24)
if (!docs.length) {
homeFeedState.done = true
return
}

let uniqueDocs = docs.filter(book => {
let title = book.title || "Untitled"
let author = book.author || (book.author_name ? book.author_name[0] : "Unknown")
let key = normalizeBookKey(title, author)
if (homeFeedState.seen[key]) return false
homeFeedState.seen[key] = true
return true
})

appendBookCards(grid, uniqueDocs)
homeFeedState.page += 1

let cardCount = grid.querySelectorAll(".book-card").length
if (cardCount >= homeFeedState.max) {
let cards = Array.from(grid.querySelectorAll(".book-card"))
cards.slice(homeFeedState.max).forEach(card => card.remove())
homeFeedState.done = true
}
} catch (error) {
} finally {
homeFeedState.loading = false
if (loadingText) loadingText.style.display = "none"
}
}

function loadFeaturedBooks() {
let grid = document.getElementById("homeBooks")
let hint = document.getElementById("featuredHint")
if (!grid) return

homeFeedState.active = true
if (hint) {
hint.style.display = "none"
}

if (!grid.querySelector(".book-card")) {
loadHomeBooks(false)
}
}

async function searchBooks() {
let input = document.getElementById("searchInput")
if (!input) return

let query = input.value.trim()
let results = document.getElementById("results")
if (!results) return

if (!query) {
results.innerHTML = ""
return
}

let response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`)
let data = await response.json()

let custom = getCustomBooks().filter(book => {
let hay = `${book.title} ${book.author} ${book.genre}`.toLowerCase()
return hay.includes(query.toLowerCase())
}).map(book => ({
title: book.title,
author: book.author,
cover: book.cover,
requiredCredits: book.requiredCredits,
genre: book.genre
}))

renderBooks(results, custom.concat(data.docs.slice(0, 12)).slice(0, 12))
}

function initSearchPageFromQuery() {
let searchInput = document.getElementById("searchInput")
if (!searchInput) return

let query = new URLSearchParams(window.location.search).get("q")
if (!query) return

searchInput.value = query
searchBooks()
}

async function loadRecommendations(reset = false) {
let div = document.getElementById("recommendations")
if (!div) return
let loadingText = document.getElementById("recommendationsLoading")

if (reset) {
recommendationFeedState = { page: 1, done: false, loading: false, items: [] }
div.innerHTML = ""
}

if (recommendationFeedState.loading || recommendationFeedState.done) return

recommendationFeedState.loading = true
if (loadingText) loadingText.style.display = "block"
try {
let docs = await fetchFeedPage("bestseller", recommendationFeedState.page, 20)
if (!docs.length) {
recommendationFeedState.done = true
return
}

appendBookCards(div, docs)
recommendationFeedState.page += 1
} catch (error) {
} finally {
recommendationFeedState.loading = false
if (loadingText) loadingText.style.display = "none"
}
}

function initInfiniteScroll() {
let home = document.getElementById("homeBooks")
let reco = document.getElementById("recommendations")
if (!home && !reco) return

window.addEventListener("scroll", function() {
let nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 280
if (!nearBottom) return

if (home) {
if (homeFeedState.active) {
loadHomeBooks(false)
}
}

if (reco) {
loadRecommendations(false)
}

function initFeaturedBooksFromHash() {
let hasSection = !!document.getElementById("featuredBooksSection")
if (!hasSection) return

if (window.location.hash === "#featuredBooksSection") {
loadFeaturedBooks()
}
}
})
}

async function loadAllBooksStatus() {
let tbody = document.getElementById("allBooksTableBody")
if (!tbody) return

let map = {}
let addToMap = function(book) {
let title = book.title || "Untitled"
let author = book.author || (book.author_name ? book.author_name[0] : "Unknown")
let key = normalizeBookKey(title, author)
if (!map[key]) {
map[key] = {
title,
author,
genre: book.genre || (book.subject && book.subject[0]) || "General",
totalCopies: getDefaultTotalCopies(book)
}
}
}

getCustomBooks().forEach(book => addToMap(book))

try {
let [tech, best] = await Promise.all([
fetchFeedPage("technology", 1, 120),
fetchFeedPage("bestseller", 1, 120)
])
tech.forEach(addToMap)
best.forEach(addToMap)
} catch (error) {
}

getIssuedBooks().forEach(book => addToMap(book))

let borrowedMap = getBorrowedCountMap()
let rows = Object.values(map)
rows.sort((a, b) => a.title.localeCompare(b.title))

tbody.innerHTML = ""

if (!rows.length) {
tbody.innerHTML = `<tr><td colspan="5">No books found.</td></tr>`
return
}

rows.forEach(book => {
let key = normalizeBookKey(book.title, book.author)
let borrowed = borrowedMap[key] || 0
let available = Math.max(0, book.totalCopies - borrowed)
tbody.innerHTML += `
<tr>
<td>${book.title}</td>
<td>${book.author}</td>
<td>${book.genre}</td>
<td>Borrowed (${borrowed})</td>
<td>Available (${available})</td>
</tr>
`
})
}

function applyRoleDashboard() {
let facultyPanel = document.getElementById("facultyActions")
let facultyHeading = document.getElementById("facultyHeading")
let borrowedBooksAction = document.getElementById("borrowedBooksAction")
let usersListAction = document.getElementById("usersListAction")
let role = getCurrentUserType()
if (!facultyPanel) return

let show = canManageLibrary()
facultyPanel.style.display = show ? "flex" : "none"
if (facultyHeading) {
if (role === "Admin") {
facultyHeading.innerText = "Admin Tools"
} else if (role === "Faculty") {
facultyHeading.innerText = "Faculty Tools"
} else {
facultyHeading.innerText = "Faculty and Admin Tools"
}
facultyHeading.style.display = show ? "block" : "none"
}

if (borrowedBooksAction) {
borrowedBooksAction.style.display = role === "Student" ? "block" : "none"
}

if (usersListAction) {
usersListAction.style.display = role === "Admin" ? "block" : "none"
}
}

ensureAuthenticated()
buildProfileMenu()
setNavProfileInfo()
initProfileMenu()
initNavSearch()
initInfiniteScroll()
loadHomeBooks(true)
loadRecommendations(true)
loadIssuedBooks()
loadProfile()
loadCustomBooksList()
loadRemoveBooksList()
loadBorrowedInfo()
loadUsersList()
loadStudentCreditTools()
loadCreditHistory()
loadRecentlyAddedBooksPage()
loadMostBorrowedBooks()
loadMostBorrowedBooksPage()
loadFeaturedBooksPage()
loadAllBooksStatus()
initSearchPageFromQuery()
initFeaturedBooksFromHash()
applyRoleDashboard()

window.addEventListener("resize", function() {
buildProfileMenu()
})
